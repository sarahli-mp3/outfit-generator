import "../styles/OutfitPreview.css";

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
  const showGeneratedImage = hasApiKey && generatedImage && !isGenerating;
  const imageSrc = showGeneratedImage ? generatedImage! : "/assets/model.png";

  return (
    <div className="right-column">
      <div className="outfit-preview">
        {hasApiKey && isGenerating && (
          <div className="progress-indicator segmented preview-progress">
            <span
              className="progress-indicator-bar"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
        )}

        <div className="field-border preview-frame">
          <img
            src={imageSrc}
            alt={showGeneratedImage ? "Generated Outfit" : "Model"}
            className="preview-image-main"
          />
        </div>

        {!hasApiKey && (
          <div className="api-key-message preview-message">
            <p>⚠️ Google API key required</p>
            <p>Please set VITE_GOOGLE_API_KEY in your .env file</p>
          </div>
        )}

        {hasApiKey && error && !error.includes("composite") && (
          <div className="error-message preview-message">
            <p>Error: {error}</p>
            <button onClick={onClearGeneratedImage}>Clear</button>
          </div>
        )}
      </div>
    </div>
  );
}
