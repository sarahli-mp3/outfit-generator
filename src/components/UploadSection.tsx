interface UploadSectionProps {
  isUploading: boolean;
  showUploadMenu: boolean;
  onToggleUploadMenu: () => void;
  onUploadTops: () => void;
  onUploadBottoms: () => void;
  onTryTop?: () => void;
  onTryBottom?: () => void;
}

export function UploadSection({
  isUploading,
  showUploadMenu,
  onToggleUploadMenu,
  onUploadTops,
  onUploadBottoms,
  onTryTop,
  onTryBottom,
}: UploadSectionProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: "0px",
        position: "relative",
      }}
    >
      {/* Try-on buttons aligned on the same row as the folder icon */}
      <div style={{ display: "flex", gap: "8px", marginRight: "8px" }}>
        <button
          className="button default"
          onClick={onTryTop}
          style={{ padding: "2px 8px" }}
        >
          Try on Top
        </button>
        <button
          className="button default"
          onClick={onTryBottom}
          style={{ padding: "2px 8px" }}
        >
          Try on Bottom
        </button>
      </div>
      <img
        src="/assets/Folder.png"
        alt="Upload"
        onClick={onToggleUploadMenu}
        style={{
          width: "32px",
          height: "32px",
          imageRendering: "pixelated",
          cursor: isUploading ? "not-allowed" : "pointer",
          opacity: isUploading ? 0.6 : 1,
          position: "relative",
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
        <div
          style={{
            position: "absolute",
            top: "0",
            right: "36px",
            background: "#c0c0c0",
            border: "2px outset #c0c0c0",
            padding: "4px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            minWidth: "90px",
          }}
        >
          <button
            onClick={onUploadTops}
            style={{
              padding: "2px 4px",
              fontSize: "10px",
              background: "#c0c0c0",
              border: "1px outset #c0c0c0",
              cursor: "pointer",
            }}
          >
            Upload Tops
          </button>
          <button
            onClick={onUploadBottoms}
            style={{
              padding: "2px 4px",
              fontSize: "10px",
              background: "#c0c0c0",
              border: "1px outset #c0c0c0",
              cursor: "pointer",
            }}
          >
            Upload Bottoms
          </button>
        </div>
      )}
    </div>
  );
}
