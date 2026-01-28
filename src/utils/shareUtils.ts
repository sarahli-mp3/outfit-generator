/**
 * Utility functions for sharing outfit images
 */

/**
 * Download an image as a PNG file
 */
export async function downloadImage(
  dataUrl: string,
  filename = "outfit.png"
): Promise<void> {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy an image to the clipboard
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const blob = await fetch(dataUrl).then((r) => r.blob());
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    return true;
  } catch (error) {
    console.error("Failed to copy image to clipboard:", error);
    return false;
  }
}

/**
 * Share an image using the Web Share API
 */
export async function shareImage(
  dataUrl: string,
  title: string
): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  try {
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const file = new File([blob], "outfit.png", { type: blob.type });

    const shareData = { title, files: [file] };

    if (!navigator.canShare(shareData)) {
      return false;
    }

    await navigator.share(shareData);
    return true;
  } catch (error) {
    // User cancelled or share failed
    console.error("Failed to share image:", error);
    return false;
  }
}

/**
 * Check if the Web Share API is available
 */
export function canShare(): boolean {
  return !!navigator.share && !!navigator.canShare;
}
