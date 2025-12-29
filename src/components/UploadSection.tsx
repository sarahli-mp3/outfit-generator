import "../styles/UploadSection.css";

interface UploadSectionProps {
  isUploading: boolean;
  showUploadMenu: boolean;
  onToggleUploadMenu: () => void;
  onUploadTops: () => void;
  onUploadBottoms: () => void;
}

export function UploadSection({
  isUploading,
  showUploadMenu,
  onToggleUploadMenu,
  onUploadTops,
  onUploadBottoms,
}: UploadSectionProps) {
  return (
    <div className="upload-section">
      <img
        src="/assets/Folder.png"
        alt="Upload"
        onClick={onToggleUploadMenu}
        className="upload-section__icon"
        style={{
          cursor: isUploading ? "not-allowed" : "pointer",
          opacity: isUploading ? 0.6 : 1,
        }}
        title="Upload new clothing item"
      />
      {isUploading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "16px",
            pointerEvents: "none",
          }}
        >
          ⏳
        </div>
      )}

      {/* Upload Menu */}
      {showUploadMenu && !isUploading && (
        <div className="upload-section__menu">
          <button
            onClick={onUploadTops}
            className="upload-section__menu-button"
          >
            Upload Tops
          </button>
          <button
            onClick={onUploadBottoms}
            className="upload-section__menu-button"
          >
            Upload Bottoms
          </button>
        </div>
      )}
    </div>
  );
}
