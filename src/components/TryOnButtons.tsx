import React from "react";

interface TryOnButtonsProps {
  onTryTop: () => void;
  onTryBottom: () => void;
}

export function TryOnButtons({ onTryTop, onTryBottom }: TryOnButtonsProps) {
  return (
    <div
      className="tryon-buttons"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "8px",
        margin: "8px 0",
      }}
    >
      <button
        className="button"
        onClick={onTryTop}
        style={{
          padding: "4px 8px",
          cursor: "pointer",
        }}
      >
        Try on Top
      </button>
      <button
        className="button"
        onClick={onTryBottom}
        style={{
          padding: "4px 8px",
          cursor: "pointer",
        }}
      >
        Try on Bottom
      </button>
    </div>
  );
}
