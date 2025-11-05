import { useState, useCallback, useEffect, useRef } from "react";
import {
  outfitGenerator,
  OutfitGenerationResult,
} from "../services/outfitGenerator";
import { imageComposer } from "../services/imageComposer";
import { rateLimiter } from "../services/rateLimiter";
import { uploadImage, saveGeneratedOutfit } from "../lib/supabase";
import type {
  ClothingItem,
  RateLimitResult,
  UseOutfitGenerationReturn,
} from "../types";

export function useOutfitGeneration(): UseOutfitGenerationReturn {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiRequired, setApiRequired] = useState<boolean>(false);
  const [isComposite, setIsComposite] = useState<boolean>(false);

  const inFlightRef = useRef(false); // synchronous guard against rapid double-clicks
  const cacheRef = useRef<Map<string, { url: string; isComposite: boolean }>>(
    new Map()
  );

  // Check API key availability
  useEffect(() => {
    const hasValidApiKey = Boolean(
      import.meta.env.VITE_GOOGLE_API_KEY &&
        import.meta.env.VITE_GOOGLE_API_KEY !== "your_google_api_key_here"
    );
    setApiRequired(!hasValidApiKey);
  }, []);

  const canGenerate = useCallback((): RateLimitResult => {
    return rateLimiter.canMakeCall();
  }, []);

  function dataUrlToFile(dataUrl: string, filename: string): File {
    const parts = dataUrl.split(",");
    const header = parts[0] || "";
    const base64 = parts[1] || "";
    const match = /data:(.*?);base64/.exec(header);
    const mime = match?.[1] || "image/png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  }

  const generateOutfit = useCallback(
    async (top: ClothingItem, bottom: ClothingItem) => {
      if (inFlightRef.current) {
        console.warn(
          "⏳ Generate already in flight. Ignoring duplicate click."
        );
        return;
      }
      inFlightRef.current = true;

      // Use item IDs for cache key
      const key = `outfit::${top.id}::${bottom.id}`;
      if (cacheRef.current.has(key)) {
        const cached = cacheRef.current.get(key)!;
        console.log("♻️ Using cached result for", top.id, bottom.id);
        setGeneratedImage(cached.url);
        setIsComposite(cached.isComposite);
        setError(null);
        inFlightRef.current = false;
        return;
      }

      // Check rate limit first
      const rateLimitCheck = canGenerate();
      if (!rateLimitCheck.allowed) {
        console.warn("🚫 Rate limit exceeded:", rateLimitCheck.reason);
        setError(rateLimitCheck.reason || "Rate limit exceeded");
        setGeneratedImage(null);
        setIsComposite(false);
        inFlightRef.current = false;
        return;
      }

      console.log("🤖 Starting outfit generation for:", top.id, bottom.id);
      setIsGenerating(true);
      setError(null);
      setIsComposite(false);

      try {
        // Record the API call
        rateLimiter.recordCall();
        console.log(
          "📊 API call recorded. Rate limit status:",
          rateLimiter.getStatus()
        );

        // Try AI generation first
        const result: OutfitGenerationResult =
          await outfitGenerator.generateOutfit(
            top.imageUrl,
            bottom.imageUrl,
            undefined,
            top.id,
            bottom.id
          );

        if (result.success && result.imageUrl) {
          console.log("✨ AI-generated image created successfully");
          setGeneratedImage(result.imageUrl);
          setIsComposite(false);
          cacheRef.current.set(key, {
            url: result.imageUrl,
            isComposite: false,
          });
        } else {
          // Fallback to composite image
          console.log("🎨 AI generation failed, using composite image");
          const compositeResult = await imageComposer.createComposite(
            top.imageUrl,
            bottom.imageUrl
          );

          if (compositeResult.success && compositeResult.imageUrl) {
            console.log("🎨 Composite image created successfully");
            setGeneratedImage(compositeResult.imageUrl);
            setIsComposite(true);
            setError("Using composite image (AI generation unavailable)");
            cacheRef.current.set(key, {
              url: compositeResult.imageUrl,
              isComposite: true,
            });
          } else {
            throw new Error(
              compositeResult.error || "Failed to create composite image"
            );
          }
        }
      } catch (err) {
        console.error("❌ Failed to generate outfit:", err);
        setError("Failed to generate outfit. Please try again.");
        setGeneratedImage(null);
        setIsComposite(false);
      } finally {
        setIsGenerating(false);
        inFlightRef.current = false;
        console.log("🏁 Outfit generation completed");
      }
    },
    [canGenerate]
  );

  const generateNanoOutfit = useCallback(
    async (occasion: string) => {
      if (inFlightRef.current) {
        console.warn(
          "⏳ Generate already in flight. Ignoring duplicate click."
        );
        return;
      }
      inFlightRef.current = true;

      // Use occasion for cache key
      const key = `nano::${occasion}`;
      if (cacheRef.current.has(key)) {
        const cached = cacheRef.current.get(key)!;
        console.log("♻️ Using cached nano result for", occasion);
        setGeneratedImage(cached.url);
        setIsComposite(false); // Nano outfits are always AI-generated
        setError(null);
        inFlightRef.current = false;
        return;
      }

      // Check rate limit first
      const rateLimitCheck = canGenerate();
      if (!rateLimitCheck.allowed) {
        console.warn("🚫 Rate limit exceeded:", rateLimitCheck.reason);
        setError(rateLimitCheck.reason || "Rate limit exceeded");
        setGeneratedImage(null);
        setIsComposite(false);
        inFlightRef.current = false;
        return;
      }

      console.log("🍌 Starting nano outfit generation for:", occasion);
      setIsGenerating(true);
      setError(null);
      setIsComposite(false);

      try {
        // Record the API call
        rateLimiter.recordCall();
        console.log(
          "📊 API call recorded. Rate limit status:",
          rateLimiter.getStatus()
        );

        // Call the nano outfit generator
        const result: OutfitGenerationResult =
          await outfitGenerator.generateNanoOutfit(occasion);

        if (result.success && result.imageUrl) {
          console.log("✨ Nano outfit generated successfully");
          let finalUrl = result.imageUrl;
          if (finalUrl.startsWith("data:")) {
            const file = dataUrlToFile(finalUrl, `nano_${Date.now()}.png`);
            finalUrl = await uploadImage("GENERATED", file, file.name);
          }
          await saveGeneratedOutfit({
            generatedImageUrl: finalUrl,
            generatorSource: "nano",
          });
          setGeneratedImage(finalUrl);
          setIsComposite(false);
          cacheRef.current.set(key, {
            url: finalUrl,
            isComposite: false,
          });
        } else {
          throw new Error(result.error || "Failed to generate nano outfit");
        }
      } catch (err) {
        console.error("❌ Failed to generate nano outfit:", err);
        setError("Failed to generate nano outfit. Please try again.");
        setGeneratedImage(null);
        setIsComposite(false);
      } finally {
        setIsGenerating(false);
        inFlightRef.current = false;
        console.log("🏁 Nano outfit generation completed");
      }
    },
    [canGenerate]
  );

  const generateOutfitTransfer = useCallback(
    async (inspirationFile: File) => {
      if (inFlightRef.current) {
        console.warn(
          "⏳ Generate already in flight. Ignoring duplicate click."
        );
        return;
      }
      inFlightRef.current = true;

      // Create a temporary URL for the file
      const inspirationUrl = URL.createObjectURL(inspirationFile);

      // Use file name and size for cache key
      const key = `transfer::${inspirationFile.name}::${inspirationFile.size}`;
      if (cacheRef.current.has(key)) {
        const cached = cacheRef.current.get(key)!;
        console.log(
          "♻️ Using cached transfer result for",
          inspirationFile.name
        );
        setGeneratedImage(cached.url);
        setIsComposite(false); // Transfer outfits are always AI-generated
        setError(null);
        inFlightRef.current = false;
        URL.revokeObjectURL(inspirationUrl);
        return;
      }

      // Check rate limit first
      const rateLimitCheck = canGenerate();
      if (!rateLimitCheck.allowed) {
        console.warn("🚫 Rate limit exceeded:", rateLimitCheck.reason);
        setError(rateLimitCheck.reason || "Rate limit exceeded");
        setGeneratedImage(null);
        setIsComposite(false);
        inFlightRef.current = false;
        URL.revokeObjectURL(inspirationUrl);
        return;
      }

      console.log("🔄 Starting outfit transfer for:", inspirationFile.name);
      setIsGenerating(true);
      setError(null);
      setIsComposite(false);

      try {
        // Record the API call
        rateLimiter.recordCall();
        console.log(
          "📊 API call recorded. Rate limit status:",
          rateLimiter.getStatus()
        );

        // Call the outfit transfer generator
        const result: OutfitGenerationResult =
          await outfitGenerator.generateOutfitTransfer(inspirationUrl);

        if (result.success && result.imageUrl) {
          console.log("✨ Outfit transfer completed successfully");
          let finalUrl = result.imageUrl;
          if (finalUrl.startsWith("data:")) {
            const file = dataUrlToFile(finalUrl, `transfer_${Date.now()}.png`);
            finalUrl = await uploadImage("GENERATED", file, file.name);
          }
          await saveGeneratedOutfit({
            generatedImageUrl: finalUrl,
            generatorSource: "transfer",
          });
          setGeneratedImage(finalUrl);
          setIsComposite(false);
          cacheRef.current.set(key, {
            url: finalUrl,
            isComposite: false,
          });
        } else {
          throw new Error(result.error || "Failed to transfer outfit");
        }
      } catch (err) {
        console.error("❌ Failed to transfer outfit:", err);
        setError("Failed to transfer outfit. Please try again.");
        setGeneratedImage(null);
        setIsComposite(false);
      } finally {
        setIsGenerating(false);
        inFlightRef.current = false;
        URL.revokeObjectURL(inspirationUrl);
        console.log("🏁 Outfit transfer completed");
      }
    },
    [canGenerate]
  );

  const clearGeneratedImage = useCallback(() => {
    console.log("🗑️ Clearing generated image");
    setGeneratedImage(null);
    setIsComposite(false);
    setError(null);
  }, []);

  return {
    generatedImage,
    isGenerating,
    error,
    apiRequired,
    isComposite,
    generateOutfit,
    generateNanoOutfit,
    generateOutfitTransfer,
    clearGeneratedImage,
    canGenerate,
  };
}
