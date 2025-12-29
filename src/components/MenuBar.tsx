import "../styles/MenuBar.css";
import { UploadSection } from "./UploadSection";

interface MenuBarProps {
  isUploading: boolean;
  showUploadMenu: boolean;
  onToggleUploadMenu: () => void;
  onUploadTops: () => void;
  onUploadBottoms: () => void;
}

export function MenuBar({
  isUploading,
  showUploadMenu,
  onToggleUploadMenu,
  onUploadTops,
  onUploadBottoms,
}: MenuBarProps) {
  return (
    <div className="menu-bar">
      <div className="menu-bar__items">
        <a href="#" className="menu-bar__item">
          File
        </a>
        <a href="#" className="menu-bar__item">
          Edit
        </a>
        <a href="#" className="menu-bar__item">
          View
        </a>
        <a href="#" className="menu-bar__item">
          Help
        </a>
      </div>

      <UploadSection
        isUploading={isUploading}
        showUploadMenu={showUploadMenu}
        onToggleUploadMenu={onToggleUploadMenu}
        onUploadTops={onUploadTops}
        onUploadBottoms={onUploadBottoms}
      />
      {/* <button
        onClick={onTestConnection}
        style={{
          padding: "2px 8px",
          fontSize: "12px",
          background: "#c0c0c0",
          border: "1px outset #c0c0c0",
          cursor: "pointer",
          marginLeft: "8px",
        }}
      >
        Test DB
      </button>
      <button
        onClick={onDebugDataMismatch}
        style={{
          padding: "2px 8px",
          fontSize: "12px",
          background: "#c0c0c0",
          border: "1px outset #c0c0c0",
          cursor: "pointer",
          marginLeft: "8px",
        }}
      >
        Check Data
      </button> */}
    </div>
  );
}
