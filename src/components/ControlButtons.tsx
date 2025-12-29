import { RateLimitResult } from "../types";
import "../styles/ControlButtons.css";

interface ControlButtonsProps {
  hasApiKey: boolean;
  canGenerateNow: boolean;
  rateLimitStatus: RateLimitResult;
  onRandom: () => void;
  onSelect: () => void;
  onNanoBananify: () => void;
  onOutfitTransfer: () => void;
}

export function ControlButtons({
  hasApiKey,
  canGenerateNow,
  rateLimitStatus,
  onRandom,
  onSelect,
  onNanoBananify,
  onOutfitTransfer,
}: ControlButtonsProps) {
  return (
    <div
      className="bottom-buttons"
      style={{ display: "flex", flexDirection: "column", gap: "8px" }}
    >
      {/* First Row */}
      <div
        style={{
          display: "flex",
          gap: "40px",
          justifyContent: "center",
        }}
      >
        <button
          className="default"
          onClick={onRandom}
          title="Random outfit"
          aria-label="Random outfit"
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            width: "120px",
          }}
        >
          Random
        </button>
        <button
          className={`default ${!canGenerateNow ? "disabled" : ""}`}
          onClick={onSelect}
          title={
            !hasApiKey
              ? "API key required"
              : !rateLimitStatus.allowed
              ? rateLimitStatus.reason || "Rate limited"
              : "Generate outfit preview"
          }
          disabled={!canGenerateNow}
          aria-label="Generate outfit preview"
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            width: "120px",
          }}
        >
          Select
        </button>
      </div>


      {/* Second Row */}
      <div
        style={{
          display: "flex",
          gap: "40px",
          justifyContent: "center",
        }}
      >
        <button
          className="default"
          onClick={onNanoBananify}
          title="Nano Bananify"
          aria-label="Nano Bananify"
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            width: "120px",
          }}
        >
          Nano Bananify
        </button>
        <button
          className="default"
          onClick={onOutfitTransfer}
          title="Outfit Transfer"
          aria-label="Outfit Transfer"
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            width: "120px",
          }}
        >
          Outfit Transfer
        </button>
      </div>
    </div>
  );
}
