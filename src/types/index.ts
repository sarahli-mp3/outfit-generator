// Global types and interfaces for the outfit application

// ===== API & Service Types =====
export interface OutfitGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface CompositeResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  waitTime?: number;
}

export interface RateLimitStatus {
  callsRemaining: number;
  nextCallAllowed: number;
  isBlocked: boolean;
  blockUntil?: number;
}

// ===== UI Component Types =====
export interface UseCarouselReturn {
  index: number;
  next: () => void;
  prev: () => void;
  setRandom: () => void;
  setIndex: (index: number) => void;
}

export interface UseOutfitGenerationReturn {
  generatedImage: string | null;
  isGenerating: boolean;
  error: string | null;
  apiRequired: boolean;
  isComposite: boolean;
  generateOutfit: (top: ClothingItem, bottom: ClothingItem) => Promise<void>;
  generateNanoOutfit: (occasion: string) => Promise<void>;
  generateOutfitTransfer: (inspirationFile: File) => Promise<void>;
  clearGeneratedImage: () => void;
  canGenerate: () => RateLimitResult;
  showCachedOutfit: (url: string) => void;
}

// ===== Data Types =====
export interface ItemOffset {
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

export interface ClothingItem {
  id: string;
  name: string;
  imageUrl: string;
  offset?: Partial<ItemOffset>;
}

// Local clothing item type (compatible with existing code)
export interface LocalClothingItem {
  id: string;
  name: string;
  imageUrl: string;
  offset?: {
    x: number;
    y: number;
    scale: number;
    zIndex: number;
  };
  isShopping?: boolean;
}

export interface PersonConfig {
  imageUrl: string;
  baseScale: number;
}

// ===== Image Processing Types =====
export interface ImageDimensions {
  width: number;
  height: number;
}

export interface PositioningConfig {
  topY: number;
  bottomY: number;
  topScale: number;
  bottomScale: number;
}

export interface ImageData {
  mimeType: string;
  data: string;
}

export interface PromptPart {
  text?: string;
  inlineData?: ImageData;
}

// ===== Environment Types =====
export interface EnvironmentConfig {
  VITE_GOOGLE_API_KEY?: string;
}

// ===== Error Types =====
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// ===== Event Types =====
export interface OutfitGenerationEvent {
  type: "start" | "success" | "error" | "composite";
  data?: any;
  timestamp: number;
}
