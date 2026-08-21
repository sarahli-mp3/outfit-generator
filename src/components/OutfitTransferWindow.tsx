import { useState, useRef } from "react";

interface OutfitTransferWindowProps {
  show: boolean;
  onClose: () => void;
  onUploadImage: (file: File) => void;
}

export function OutfitTransferWindow({
  show,
  onClose,
  onUploadImage,
}: OutfitTransferWindowProps) {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!show) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleTransferClick = () => {
    if (uploadedImage) {
      onUploadImage(uploadedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    setUploadedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  return (
    <div
      className="window"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "400px",
        height: "auto",
        maxHeight: "500px",
        zIndex: 2000,
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Outfit Transfer</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close" onClick={handleClose}></button>
        </div>
      </div>
      <div className="window-body" style={{ padding: "8px", height: "auto" }}>
        <p style={{ margin: "0 0 8px 0" }}>
          Upload an inspiration image to transfer its outfit onto the model
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        {!uploadedImage ? (
          <div style={{ textAlign: "center" }}>
            <button
              className="default"
              onClick={handleUploadClick}
              style={{
                marginTop: "10px",
                padding: "4px 8px",
                fontSize: "12px",
                width: "120px",
                minWidth: "auto",
              }}
            >
              Select Image
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            {previewUrl && (
              <div style={{ marginBottom: "10px" }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: "200px",
                    maxHeight: "200px",
                    border: "1px solid #ccc",
                  }}
                />
                <p style={{ fontSize: "11px", margin: "4px 0" }}>
                  {uploadedImage.name}
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                className="default"
                onClick={handleUploadClick}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  width: "80px",
                }}
              >
                Change
              </button>
              <button
                className="default"
                onClick={handleTransferClick}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  width: "80px",
                }}
              >
                Transfer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
