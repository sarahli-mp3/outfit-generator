interface NanoWindowProps {
  show: boolean;
  nanoText: string;
  onClose: () => void;
  onTextChange: (text: string) => void;
  onStyle: () => void;
}

export function NanoWindow({
  show,
  nanoText,
  onClose,
  onTextChange,
  onStyle,
}: NanoWindowProps) {
  if (!show) return null;

  return (
    <div
      className="window"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "250px",
        height: "auto",
        maxHeight: "200px",
        zIndex: 2000,
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Nano Bananify Me :D</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close" onClick={onClose}></button>
        </div>
      </div>
      <div className="window-body" style={{ padding: "8px", height: "auto" }}>
        <p style={{ margin: "0 0 8px 0" }}>What should I wear to ...</p>
        <div className="field-row-stacked" style={{ width: "100%" }}>
          <textarea
            id="text20"
            rows={4}
            value={nanoText}
            onChange={(e) => onTextChange(e.target.value)}
            style={{ width: "100%" }}
          ></textarea>
        </div>
        <div style={{ textAlign: "center" }}>
          <button
            className="default"
            onClick={onStyle}
            style={{
              marginTop: "20px",
              padding: "4px 8px",
              fontSize: "12px",
              width: "100px",
              minWidth: "auto",
            }}
          >
            Style me!
          </button>
        </div>
      </div>
    </div>
  );
}
