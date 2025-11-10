interface AlreadyWornWindowProps {
  show: boolean;
  onClose: () => void;
}

export function AlreadyWornWindow({ show, onClose }: AlreadyWornWindowProps) {
  if (!show) return null;

  return (
    <div
      className="window"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "300px",
        height: "auto",
        maxHeight: "160px",
        zIndex: 2100,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Already Worn"
    >
      <div className="title-bar">
        <div className="title-bar-text">Heads up</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close" onClick={onClose}></button>
        </div>
      </div>
      <div className="window-body" style={{ padding: "10px", height: "auto" }}>
        <p style={{ margin: "0 0 10px 0" }}>
          You&apos;ve generated this outfit combo before. Want to try it again?
        </p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}
        >
          <button className="default" onClick={onClose} aria-label="Close">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
