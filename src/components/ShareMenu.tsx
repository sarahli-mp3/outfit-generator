import { useEffect, useRef } from "react";
import {
  downloadImage,
  copyImageToClipboard,
  shareImage,
  canShare,
} from "../utils/shareUtils";

interface ShareMenuProps {
  imageUrl: string;
  onClose: () => void;
}

export function ShareMenu({ imageUrl, onClose }: ShareMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleDownload = async () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    await downloadImage(imageUrl, `outfit-${timestamp}.png`);
    onClose();
  };

  const handleCopy = async () => {
    const success = await copyImageToClipboard(imageUrl);
    if (success) {
      onClose();
    }
  };

  const handleShare = async () => {
    const success = await shareImage(imageUrl, "My Outfit98 Creation");
    if (success) {
      onClose();
    }
  };

  return (
    <div className="share-menu" ref={menuRef}>
      <button className="share-menu-item" onClick={handleDownload}>
        <span className="share-menu-icon">&#128190;</span>
        Save to Computer
      </button>
      <button className="share-menu-item" onClick={handleCopy}>
        <span className="share-menu-icon">&#128203;</span>
        Copy to Clipboard
      </button>
      {canShare() && (
        <button className="share-menu-item" onClick={handleShare}>
          <span className="share-menu-icon">&#128228;</span>
          Share...
        </button>
      )}
    </div>
  );
}
