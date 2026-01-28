function isQuotaError(err: any): boolean {
  const code = err?.error?.code || err?.status || err?.code;
  if (code === 429) return true;
  const status = err?.error?.status || err?.statusMessage;
  return status === "RESOURCE_EXHAUSTED";
}

function getRetryMsFromError(err: any, fallbackMs = 20000): number {
  try {
    const details = err?.error?.details || [];
    const retry = details.find((d: any) => d["@type"]?.includes("RetryInfo"));
    if (retry?.retryDelay) {
      const m = /^(\d+)(?:\.(\d+))?s$/.exec(retry.retryDelay);
      if (m) {
        const sec = parseInt(m[1], 10);
        const frac = m[2] ? parseInt(m[2].slice(0, 3).padEnd(3, "0"), 10) : 0; // ms
        return sec * 1000 + frac;
      }
    }
  } catch {}
  return fallbackMs;
}

import { GoogleGenAI } from "@google/genai";
import {
  getCachedComposite,
  saveCachedComposite,
  uploadImage,
} from "../lib/supabase";

// Types
export interface OutfitGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

// Constants
const MODEL = "gemini-3-pro-image-preview";
const DEFAULT_BODY_PATH = "/assets/model.png";
const CACHE_PREFIX = "outfit_";

const genAI = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || "",
});

function cacheKeyFor(
  topPath: string,
  bottomPath: string,
  bodyPath: string,
  prompt: string
): string {
  return `${CACHE_PREFIX}${MODEL}|${topPath}|${bottomPath}|${bodyPath}|v1:${prompt.length}`;
}

function buildPrompt(): string {
  return `Clothing-only inpainting task: You must treat this as a MASKED EDIT where ONLY the clothing pixels change.

INPUT: Image 3 = person photo, Image 1 = top garment, Image 2 = bottom garment.

TASK: Replace ONLY the clothing regions in image 3 with the garments from images 1 and 2.

PROTECTED REGIONS (copy pixel-perfect from image 3, NO modifications allowed):
- Face: every facial feature, skin texture, lighting, and expression
- Skin: all visible skin must keep EXACT original color, tone, and lighting
- Hair: same color, style, and position
- Hands and arms: same skin tone and position
- Background: solid white (#FFFFFF)

EDITABLE REGION (clothing area only):
- Remove existing clothes and replace with top from image 1 and bottom from image 2
- Fit garments naturally to body shape and pose
- Match garment lighting to the original photo lighting
- Preserve garment colors, patterns, and text exactly as shown

OUTPUT: The original person wearing the new outfit, looking like a natural photo. The person must be instantly recognizable as the same individual.`;
}

// Intentionally unused experimental prompt helpers removed to reduce noise

async function toBase64(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const blob = await res.blob();
  // Use FileReader to avoid spreading a large Uint8Array into a single call (which overflows the call stack).
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string; // data:*/*;base64,<data>
      const comma = result.indexOf(",");
      if (comma === -1) return reject(new Error("Unexpected DataURL format"));
      resolve(result.slice(comma + 1));
    };
    reader.onerror = () =>
      reject(reader.error || new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

// Helper function to convert data URL to File
function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

async function generateOutfitInternal(
  topPath: string,
  bottomPath: string,
  bodyPath: string = DEFAULT_BODY_PATH,
  topId?: string,
  bottomId?: string
): Promise<OutfitGenerationResult> {
  if (!import.meta.env.VITE_GOOGLE_API_KEY) {
    return {
      success: false,
      error: "Set VITE_GOOGLE_API_KEY and enable billing for image generation.",
    };
  }

  // Check Supabase cache first if we have IDs
  if (topId && bottomId) {
    const cachedUrl = await getCachedComposite(topId, bottomId);
    if (cachedUrl) {
      return { success: true, imageUrl: cachedUrl };
    }
  }

  const prompt = buildPrompt();
  const key = cacheKeyFor(topPath, bottomPath, bodyPath, prompt);

  // simple in memory cache
  (window as any).__outfitCache =
    (window as any).__outfitCache || new Map<string, string>();
  const cache = (window as any).__outfitCache as Map<string, string>;
  if (cache.has(key)) {
    const dataUrl = cache.get(key)!;

    // If we have IDs, save to Supabase storage
    if (topId && bottomId) {
      try {
        const file = dataUrlToFile(
          dataUrl,
          `outfit_${topId}_${bottomId}_${Date.now()}.png`
        );
        const storageUrl = await uploadImage("GENERATED", file, file.name);
        await saveCachedComposite(topId, bottomId, storageUrl);
        return { success: true, imageUrl: storageUrl };
      } catch (error) {
        console.error("Error saving to Supabase:", error);
        // Fall back to data URL if storage fails
        return { success: true, imageUrl: dataUrl };
      }
    }

    return { success: true, imageUrl: dataUrl };
  }

  const [topB64, bottomB64, bodyB64] = await Promise.all([
    toBase64(topPath),
    toBase64(bottomPath),
    toBase64(bodyPath),
  ]);

  const contents = [
    { text: prompt },
    { inlineData: { mimeType: "image/png", data: topB64 } }, // image 1 top
    { inlineData: { mimeType: "image/png", data: bottomB64 } }, // image 2 bottom
    { inlineData: { mimeType: "image/png", data: bodyB64 } }, // image 3 body
  ];

  let resp;
  let attempt = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      resp = await genAI.models.generateContent({ model: MODEL, contents });
      break;
    } catch (err: any) {
      if (!isQuotaError(err) || attempt >= maxAttempts - 1) {
        const msg =
          typeof err?.message === "string" ? err.message : JSON.stringify(err);
        return { success: false, error: `Gemini API error. ${msg}` };
      }
      attempt += 1;
      const base = getRetryMsFromError(err, 20000);
      const waitMs = Math.round(base * Math.pow(2, attempt - 1));
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  const parts = resp.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);
  if (!imagePart) {
    const msg =
      parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join("\n") || "No image data returned";
    return { success: false, error: `Gemini did not return an image. ${msg}` };
  }

  // Fix linter error: check if inlineData exists before accessing data
  if (!imagePart.inlineData?.data) {
    return { success: false, error: "No image data in response" };
  }

  const dataUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
  cache.set(key, dataUrl);

  // If we have IDs, save to Supabase storage
  if (topId && bottomId) {
    try {
      const file = dataUrlToFile(
        dataUrl,
        `outfit_${topId}_${bottomId}_${Date.now()}.png`
      );
      const storageUrl = await uploadImage("GENERATED", file, file.name);
      await saveCachedComposite(topId, bottomId, storageUrl);
      return { success: true, imageUrl: storageUrl };
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      // Fall back to data URL if storage fails
    }
  }

  return { success: true, imageUrl: dataUrl };
}

// New function for Nano Banana styling with custom prompts
async function generateNanoOutfitInternal(
  bodyPath: string = DEFAULT_BODY_PATH,
  customPrompt: string
): Promise<OutfitGenerationResult> {
  if (!import.meta.env.VITE_GOOGLE_API_KEY) {
    return {
      success: false,
      error: "Set VITE_GOOGLE_API_KEY and enable billing for image generation.",
    };
  }

  const key = `nano_${MODEL}|${bodyPath}|v1:${customPrompt.length}`;

  // simple in memory cache
  (window as any).__nanoCache =
    (window as any).__nanoCache || new Map<string, string>();
  const cache = (window as any).__nanoCache as Map<string, string>;
  if (cache.has(key)) {
    const dataUrl = cache.get(key)!;
    return { success: true, imageUrl: dataUrl };
  }

  const bodyB64 = await toBase64(bodyPath);

  const contents = [
    { text: customPrompt },
    { inlineData: { mimeType: "image/png", data: bodyB64 } }, // model image
  ];

  let resp;
  let attempt = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      resp = await genAI.models.generateContent({ model: MODEL, contents });
      break;
    } catch (err: any) {
      if (!isQuotaError(err) || attempt >= maxAttempts - 1) {
        const msg =
          typeof err?.message === "string" ? err.message : JSON.stringify(err);
        return { success: false, error: `Gemini API error. ${msg}` };
      }
      attempt += 1;
      const base = getRetryMsFromError(err, 20000);
      const waitMs = Math.round(base * Math.pow(2, attempt - 1));
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  const parts = resp.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);
  if (!imagePart) {
    const msg =
      parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join("\n") || "No image data returned";
    return { success: false, error: `Gemini did not return an image. ${msg}` };
  }

  // Fix linter error: check if inlineData exists before accessing data
  if (!imagePart.inlineData?.data) {
    return { success: false, error: "No image data in response" };
  }

  const dataUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
  console.log("Generated Nano Outfit Image:", dataUrl);
  console.log(
    "You can copy this data URL and paste it in a new browser tab to view the image"
  );
  cache.set(key, dataUrl);

  return { success: true, imageUrl: dataUrl };
}

// New function for outfit transfer from inspiration image
async function generateOutfitTransferInternal(
  inspirationImagePath: string,
  bodyPath: string = DEFAULT_BODY_PATH
): Promise<OutfitGenerationResult> {
  if (!import.meta.env.VITE_GOOGLE_API_KEY) {
    return {
      success: false,
      error: "Set VITE_GOOGLE_API_KEY and enable billing for image generation.",
    };
  }

  const transferPrompt = `Clothing-only inpainting task: You must treat this as a MASKED EDIT where ONLY the clothing pixels change.

INPUT: Image 1 = person photo, Image 2 = reference outfit photo.

TASK: Replace ONLY the clothing regions in image 1 with the outfit visible in image 2.

PROTECTED REGIONS (copy pixel-perfect from image 1, NO modifications allowed):
- Face: every facial feature, skin texture, lighting, and expression
- Skin: all visible skin must keep EXACT original color, tone, and lighting
- Hair: same color, style, and position
- Hands and arms: same skin tone and position
- Background: solid white (#FFFFFF)

EDITABLE REGION (clothing area only):
- Remove existing clothes and replace with the outfit from image 2
- Fit garments naturally to body shape and pose from image 1
- Match garment lighting to the original photo lighting

OUTPUT: The original person wearing the transferred outfit, looking like a natural photo. The person must be instantly recognizable as the same individual.`;

  const key = `transfer_${MODEL}|${inspirationImagePath}|${bodyPath}|v1:${transferPrompt.length}`;

  // simple in memory cache
  (window as any).__transferCache =
    (window as any).__transferCache || new Map<string, string>();
  const cache = (window as any).__transferCache as Map<string, string>;
  if (cache.has(key)) {
    const dataUrl = cache.get(key)!;
    return { success: true, imageUrl: dataUrl };
  }

  const [bodyB64, inspirationB64] = await Promise.all([
    toBase64(bodyPath),
    toBase64(inspirationImagePath),
  ]);

  const contents = [
    { text: transferPrompt },
    { inlineData: { mimeType: "image/png", data: bodyB64 } }, // image 1 - model
    { inlineData: { mimeType: "image/png", data: inspirationB64 } }, // image 2 - inspiration
  ];

  let resp;
  let attempt = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      resp = await genAI.models.generateContent({ model: MODEL, contents });
      break;
    } catch (err: any) {
      if (!isQuotaError(err) || attempt >= maxAttempts - 1) {
        const msg =
          typeof err?.message === "string" ? err.message : JSON.stringify(err);
        return { success: false, error: `Gemini API error. ${msg}` };
      }
      attempt += 1;
      const base = getRetryMsFromError(err, 20000);
      const waitMs = Math.round(base * Math.pow(2, attempt - 1));
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  const parts = resp.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);
  if (!imagePart) {
    const msg =
      parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join("\n") || "No image data returned";
    return { success: false, error: `Gemini did not return an image. ${msg}` };
  }

  // Fix linter error: check if inlineData exists before accessing data
  if (!imagePart.inlineData?.data) {
    return { success: false, error: "No image data in response" };
  }

  const dataUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
  cache.set(key, dataUrl);

  return { success: true, imageUrl: dataUrl };
}

// Backward compatibility class wrapper
export class OutfitGenerator {
  private static instance: OutfitGenerator;

  private constructor() {}

  static getInstance(): OutfitGenerator {
    if (!OutfitGenerator.instance) {
      OutfitGenerator.instance = new OutfitGenerator();
    }
    return OutfitGenerator.instance;
  }

  async generateOutfit(
    topPath: string,
    bottomPath: string,
    bodyPath: string = DEFAULT_BODY_PATH,
    topId?: string,
    bottomId?: string
  ): Promise<OutfitGenerationResult> {
    return generateOutfitInternal(
      topPath,
      bottomPath,
      bodyPath,
      topId,
      bottomId
    );
  }

  async generateNanoOutfit(
    occasion: string,
    bodyPath: string = DEFAULT_BODY_PATH
  ): Promise<OutfitGenerationResult> {
    const customPrompt = `Clothing-only inpainting task: You must treat this as a MASKED EDIT where ONLY the clothing pixels change.

INPUT: Image of a person who needs an outfit for: "${occasion}"

TASK: Generate and add ONLY clothing appropriate for the occasion to the person.

PROTECTED REGIONS (copy pixel-perfect from original, NO modifications allowed):
- Face: every facial feature, skin texture, lighting, and expression
- Skin: all visible skin must keep EXACT original color, tone, and lighting
- Hair: same color, style, and position
- Hands and arms: same skin tone and position
- Background: solid white (#FFFFFF)

EDITABLE REGION (clothing area only):
- Add stylish, appropriate clothing for "${occasion}"
- Fit garments naturally to body shape and pose
- Match garment lighting to the original photo lighting

OUTPUT: The original person wearing a new outfit for ${occasion}, looking like a natural photo. The person must be instantly recognizable as the same individual.`;

    return generateNanoOutfitInternal(bodyPath, customPrompt);
  }

  async generateOutfitTransfer(
    inspirationImagePath: string,
    bodyPath: string = DEFAULT_BODY_PATH
  ): Promise<OutfitGenerationResult> {
    return generateOutfitTransferInternal(inspirationImagePath, bodyPath);
  }

  clearCache(): void {
    (window as any).__outfitCache = new Map<string, string>();
    (window as any).__nanoCache = new Map<string, string>();
    (window as any).__transferCache = new Map<string, string>();
  }

  getCacheSize(): number {
    const cache = (window as any).__outfitCache as
      | Map<string, string>
      | undefined;
    const nanoCache = (window as any).__nanoCache as
      | Map<string, string>
      | undefined;
    const transferCache = (window as any).__transferCache as
      | Map<string, string>
      | undefined;
    return (
      (cache?.size || 0) + (nanoCache?.size || 0) + (transferCache?.size || 0)
    );
  }
}

// Export the singleton instance for backward compatibility
export const outfitGenerator = OutfitGenerator.getInstance();
