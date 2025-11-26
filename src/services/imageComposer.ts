// Types
export interface CompositeResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface PositioningConfig {
  topY: number;
  bottomY: number;
  topScale: number;
  bottomScale: number;
}

// Constants
const DEFAULT_BODY_PATH = "../public/assets/model.png";
const TOP_POSITION_RATIO = 0.15; // 15% from top
const BOTTOM_POSITION_RATIO = 0.4; // 40% from top
const MAX_TOP_SCALE_RATIO = 0.3; // Max 30% of canvas width
const MAX_BOTTOM_SCALE_RATIO = 0.25; // Max 25% of canvas width

export class ImageComposer {
  private static instance: ImageComposer;

  private constructor() {}

  static getInstance(): ImageComposer {
    if (!ImageComposer.instance) {
      ImageComposer.instance = new ImageComposer();
    }
    return ImageComposer.instance;
  }

  private calculatePositioning(
    bodyImg: HTMLImageElement,
    topImg: HTMLImageElement,
    bottomImg: HTMLImageElement
  ): PositioningConfig {
    const canvasWidth = bodyImg.width;
    const canvasHeight = bodyImg.height;

    // Calculate scales to fit within reasonable bounds
    const topScale = Math.min(
      (canvasWidth * MAX_TOP_SCALE_RATIO) / topImg.width,
      (canvasHeight * 0.2) / topImg.height
    );

    const bottomScale = Math.min(
      (canvasWidth * MAX_BOTTOM_SCALE_RATIO) / bottomImg.width,
      (canvasHeight * 0.3) / bottomImg.height
    );

    return {
      topY: canvasHeight * TOP_POSITION_RATIO,
      bottomY: canvasHeight * BOTTOM_POSITION_RATIO,
      topScale,
      bottomScale,
    };
  }

  private drawImageWithTransform(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    scale: number
  ): void {
    ctx.save();
    ctx.translate(x + (img.width * scale) / 2, y + (img.height * scale) / 2);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  private createCanvas(bodyImg: HTMLImageElement): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Set canvas size to match the model image
    canvas.width = bodyImg.width;
    canvas.height = bodyImg.height;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    return { canvas, ctx };
  }

  async createComposite(
    topPath: string,
    bottomPath: string,
    bodyPath: string = DEFAULT_BODY_PATH
  ): Promise<CompositeResult> {
    try {
      if (import.meta.env.DEV)
        console.log("Creating composite image with model...");

      // Load images
      const [topImg, bottomImg, bodyImg] = await Promise.all([
        this.loadImage(topPath),
        this.loadImage(bottomPath),
        this.loadImage(bodyPath),
      ]);

      // Create canvas and context
      const { canvas, ctx } = this.createCanvas(bodyImg);

      // Draw the model first (base layer)
      ctx.drawImage(bodyImg, 0, 0);

      // Calculate positioning and scaling
      const config = this.calculatePositioning(bodyImg, topImg, bottomImg);
      const modelCenterX = canvas.width / 2;

      // Draw top clothing
      const topX = modelCenterX - (topImg.width * config.topScale) / 2;
      this.drawImageWithTransform(
        ctx,
        topImg,
        topX,
        config.topY,
        config.topScale
      );

      // Draw bottom clothing
      const bottomX = modelCenterX - (bottomImg.width * config.bottomScale) / 2;
      this.drawImageWithTransform(
        ctx,
        bottomImg,
        bottomX,
        config.bottomY,
        config.bottomScale
      );

      // Convert to data URL
      const imageUrl = canvas.toDataURL("image/png");

      if (import.meta.env.DEV)
        console.log("Composite image created successfully with model");

      return {
        success: true,
        imageUrl,
      };
    } catch (error) {
      console.error("Error creating composite:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        if (import.meta.env.DEV)
          console.log(`Image loaded successfully: ${src}`);
        resolve(img);
      };

      img.onerror = (error) => {
        console.error(`Failed to load image: ${src}`, error);
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });
  }

  // Utility method to get image dimensions without loading
  async getImageDimensions(src: string): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }
}

// Export singleton instance
export const imageComposer = ImageComposer.getInstance();
