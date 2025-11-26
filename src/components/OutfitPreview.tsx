interface OutfitPreviewProps {
  hasApiKey: boolean;
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;
  generatedImage: string | null;
  onClearGeneratedImage: () => void;
}

export function OutfitPreview({
  hasApiKey,
  isGenerating,
  generationProgress,
  error,
  generatedImage,
  onClearGeneratedImage,
}: OutfitPreviewProps) {
  return (
    <div className="right-column">
      <div>
        {/* Show progress indicator when generating */}
        {hasApiKey && isGenerating && (
          <div
            className="progress-indicator segmented"
            style={{
              position: "absolute",
              top: "45%",
              left: "70%",
              transform: "translate(-50%, -50%)",
              width: "240px",
              height: "20px",
              zIndex: 10,
            }}
          >
            <span
              className="progress-indicator-bar"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        )}

        {/* Show model image when not generating */}
        {!isGenerating && (
          <div
            className="field-border"
            style={{
              position: "absolute",
              top: "45%",
              left: "70%",
              transform: "translate(-50%, -50%)",
              padding: "8px",
              width: "240px",
              height: "480px",
              zIndex: 5,
            }}
          >
            <img
              src="../public/assets/model.png"
              alt="Model"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                imageRendering: "auto",
                display: "block",
              }}
            />
          </div>
        )}

        {!hasApiKey && (
          <div className="api-key-message">
            <p>⚠️ Google API key required</p>
            <p>Please set VITE_GOOGLE_API_KEY in your .env file</p>
          </div>
        )}

        {hasApiKey && error && !error.includes("composite") && (
          <div className="error-message">
            <p>Error: {error}</p>
            <button onClick={onClearGeneratedImage}>Clear</button>
          </div>
        )}

        {hasApiKey && generatedImage && !isGenerating && (
          <div
            className="field-border"
            style={{
              position: "absolute",
              top: "45%",
              left: "70%",
              transform: "translate(-50%, -50%)",
              padding: "8px",
              width: "240px",
              height: "480px",
              zIndex: 10,
            }}
          >
            <img
              src={generatedImage}
              alt="Generated Outfit"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                imageRendering: "auto",
                backgroundColor: "white",
                mixBlendMode: "normal",
                display: "block",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
