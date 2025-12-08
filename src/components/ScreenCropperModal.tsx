import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ScreenCropperModalProps {
  open: boolean;
  category: "tops" | "bottoms";
  onClose: () => void;
  onConfirm: (file: File) => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Phase = "idle" | "stream" | "captured";

export function ScreenCropperModal({
  open,
  category,
  onClose,
  onConfirm,
}: ScreenCropperModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dragMode, setDragMode] = useState<null | {
    type: "new" | "move" | "nw" | "ne" | "sw" | "se";
    ox: number;
    oy: number;
  }>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  // Displayed size of captured image (set on image load to avoid 0x0 overlay)
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const handleBaseImageLoad = useCallback(() => {
    const iw = baseImgRef.current?.naturalWidth || 0;
    const ih = baseImgRef.current?.naturalHeight || 0;
    if (!iw || !ih) {
      setDisplaySize({ w: 0, h: 0 });
      return;
    }
    const maxW = 900;
    const maxH = 600;
    const scale = Math.min(maxW / iw, maxH / ih, 1);
    setDisplaySize({ w: Math.round(iw * scale), h: Math.round(ih * scale) });
  }, []);
  // Enable capture only when video has metadata
  const [canCapture, setCanCapture] = useState<boolean>(false);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setError(null);
      setImageUrl(null);
      setRect(null);
      setPreviewDataUrl(null);
      stopStream();
      return;
    }
    // When opened, start screen capture
    async function start() {
      setError(null);
      setPhase("stream");
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor" as any,
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          const v = videoRef.current;
          setCanCapture(false);
          v.srcObject = stream;
          await new Promise<void>((resolve) => {
            const onLoaded = () => {
              setCanCapture(true);
              resolve();
            };
            v.addEventListener("loadedmetadata", onLoaded, { once: true });
          });
          await v.play();
        }
      } catch (e: any) {
        setError(e?.message || "Failed to start screen capture");
        setPhase("idle");
      }
    }
    start();
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function captureFrame() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      await new Promise<void>((resolve) => {
        const onLoaded = () => resolve();
        video.addEventListener("loadeddata", onLoaded, { once: true });
      });
    }
    const w = video.videoWidth || 0;
    const h = video.videoHeight || 0;
    if (!w || !h) {
      setError("No video frame available");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const url = canvas.toDataURL("image/png");
    setImageUrl(url);
    setPhase("captured");
    stopStream();
    // Reset selection and preview for the new capture
    setRect(null);
    setPreviewDataUrl(null);
  }

  // Update preview when rect changes
  useEffect(() => {
    if (!imageUrl || !rect || !baseImgRef.current) {
      setPreviewDataUrl(null);
      return;
    }
    const img = baseImgRef.current;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;
    // rect is in image coordinates already
    const rx = Math.max(0, Math.min(rect.x, iw));
    const ry = Math.max(0, Math.min(rect.y, ih));
    const rw = Math.max(1, Math.min(rect.w, iw - rx));
    const rh = Math.max(1, Math.min(rect.h, ih - ry));
    const c = document.createElement("canvas");
    c.width = rw;
    c.height = rh;
    const cx = c.getContext("2d");
    if (!cx) return;
    // Draw base onto canvas at negative offset to crop
    cx.drawImage(img, -rx, -ry);
    setPreviewDataUrl(c.toDataURL("image/png"));
  }, [imageUrl, rect]);

  function clientToImageCoords(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    if (!baseImgRef.current || !overlayRef.current) return { x: 0, y: 0 };
    const bounds = overlayRef.current.getBoundingClientRect();
    const dx = clientX - bounds.left;
    const dy = clientY - bounds.top;
    const iw = baseImgRef.current.naturalWidth;
    const ih = baseImgRef.current.naturalHeight;
    const scaleX = iw / (displaySize.w || 1);
    const scaleY = ih / (displaySize.h || 1);
    return { x: Math.max(0, dx * scaleX), y: Math.max(0, dy * scaleY) };
  }

  function hitHandle(px: number, py: number): null | "nw" | "ne" | "sw" | "se" {
    if (!rect) return null;
    const handleSize = 10;
    const corners: Array<{
      key: "nw" | "ne" | "sw" | "se";
      x: number;
      y: number;
    }> = [
      { key: "nw", x: rect.x, y: rect.y },
      { key: "ne", x: rect.x + rect.w, y: rect.y },
      { key: "sw", x: rect.x, y: rect.y + rect.h },
      { key: "se", x: rect.x + rect.w, y: rect.y + rect.h },
    ];
    for (const c of corners) {
      if (
        Math.abs(px - c.x) <= handleSize &&
        Math.abs(py - c.y) <= handleSize
      ) {
        return c.key;
      }
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!overlayRef.current) return;
    overlayRef.current.setPointerCapture(e.pointerId);
    const pt = clientToImageCoords(e.clientX, e.clientY);
    // Decide drag mode
    const handle = hitHandle(pt.x, pt.y);
    if (handle) {
      setDragMode({ type: handle, ox: pt.x, oy: pt.y });
      return;
    }
    if (
      rect &&
      pt.x >= rect.x &&
      pt.x <= rect.x + rect.w &&
      pt.y >= rect.y &&
      pt.y <= rect.y + rect.h
    ) {
      setDragMode({ type: "move", ox: pt.x - rect.x, oy: pt.y - rect.y });
      return;
    }
    // New rect
    setRect({ x: pt.x, y: pt.y, w: 1, h: 1 });
    setDragMode({ type: "new", ox: pt.x, oy: pt.y });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragMode) return;
    const pt = clientToImageCoords(e.clientX, e.clientY);
    setRect((prev) => {
      const r = prev ? { ...prev } : { x: pt.x, y: pt.y, w: 1, h: 1 };
      switch (dragMode.type) {
        case "new":
          r.w = Math.max(1, pt.x - r.x);
          r.h = Math.max(1, pt.y - r.y);
          break;
        case "move": {
          const iw = baseImgRef.current?.naturalWidth || 0;
          const ih = baseImgRef.current?.naturalHeight || 0;
          let nx = pt.x - dragMode.ox;
          let ny = pt.y - dragMode.oy;
          nx = Math.max(0, Math.min(nx, Math.max(0, iw - r.w)));
          ny = Math.max(0, Math.min(ny, Math.max(0, ih - r.h)));
          r.x = nx;
          r.y = ny;
          break;
        }
        case "nw": {
          const nx = Math.min(r.x + r.w - 1, pt.x);
          const ny = Math.min(r.y + r.h - 1, pt.y);
          r.w = r.x + r.w - nx;
          r.h = r.y + r.h - ny;
          r.x = nx;
          r.y = ny;
          break;
        }
        case "ne": {
          const nx = Math.max(r.x + 1, pt.x);
          const ny = Math.min(r.y + r.h - 1, pt.y);
          r.w = nx - r.x;
          r.h = r.y + r.h - ny;
          r.y = ny;
          break;
        }
        case "sw": {
          const nx = Math.min(r.x + r.w - 1, pt.x);
          const ny = Math.max(r.y + 1, pt.y);
          r.w = r.x + r.w - nx;
          r.h = ny - r.y;
          r.x = nx;
          break;
        }
        case "se": {
          const nx = Math.max(r.x + 1, pt.x);
          const ny = Math.max(r.y + 1, pt.y);
          r.w = nx - r.x;
          r.h = ny - r.y;
          break;
        }
      }
      return r;
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!overlayRef.current) return;
    try {
      overlayRef.current.releasePointerCapture(e.pointerId);
    } catch {}
    setDragMode(null);
  }

  async function handleConfirm() {
    if (!imageUrl || !rect || !baseImgRef.current) return;
    const img = baseImgRef.current;
    const rx = Math.max(0, Math.min(rect.x, img.naturalWidth));
    const ry = Math.max(0, Math.min(rect.y, img.naturalHeight));
    const rw = Math.max(1, Math.min(rect.w, img.naturalWidth - rx));
    const rh = Math.max(1, Math.min(rect.h, img.naturalHeight - ry));
    const c = document.createElement("canvas");
    c.width = Math.round(rw);
    c.height = Math.round(rh);
    const cx = c.getContext("2d");
    if (!cx) return;
    cx.drawImage(img, -rx, -ry);
    // Post-process: remove background based on border flood fill
    try {
      removeBackgroundInPlace(c);
    } catch (e) {
      // Fallback silently if background removal fails
      console.warn("Background removal failed; saving original crop", e);
    }
    return new Promise<void>((resolve) => {
      c.toBlob((blob) => {
        if (!blob) return resolve();
        const ts = Date.now();
        const base = category === "tops" ? "top" : "bottom";
        const file = new File([blob], `${base}_${ts}.png`, {
          type: "image/png",
        });
        onConfirm(file);
        resolve();
      }, "image/png");
    });
  }

  // ----- Background removal utilities -----
  function colorDistSq(
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
  ) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return dr * dr + dg * dg + db * db;
  }

  function sampleBorderAvg(data: Uint8ClampedArray, w: number, h: number) {
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    // top and bottom rows
    for (let x = 0; x < w; x++) {
      let i = (0 * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
      i = ((h - 1) * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    // left and right columns
    for (let y = 0; y < h; y++) {
      let i = (y * w + 0) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
      i = (y * w + (w - 1)) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    return { r: r / n, g: g / n, b: b / n };
  }

  function removeBackgroundInPlace(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;

    // Estimate background color from border pixels
    const avg = sampleBorderAvg(data, w, h);
    // Threshold: allow moderate deviation (tuned for white/light backgrounds)
    const baseThreshSq = 55 * 55; // ~color distance
    const whiteThreshSq = 35 * 35;

    const isBg = (r: number, g: number, b: number) => {
      // near average or near white counts as background
      const dAvg = colorDistSq(r, g, b, avg.r, avg.g, avg.b);
      const dW = colorDistSq(r, g, b, 255, 255, 255);
      return dAvg <= baseThreshSq || dW <= whiteThreshSq;
    };

    // Flood fill from borders to find connected background area
    const visited = new Uint8Array(w * h);
    const q = new Uint32Array(w * h);
    let qh = 0,
      qt = 0;
    function enqueue(x: number, y: number) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const idx = y * w + x;
      if (visited[idx]) return;
      const off = idx * 4;
      if (!isBg(data[off], data[off + 1], data[off + 2])) return;
      visited[idx] = 1;
      q[qt++] = idx;
    }
    // seed with full border
    for (let x = 0; x < w; x++) {
      enqueue(x, 0);
      enqueue(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      enqueue(0, y);
      enqueue(w - 1, y);
    }

    while (qh < qt) {
      const idx = q[qh++];
      const off = idx * 4;
      // make transparent
      data[off + 3] = 0;
      const x = idx % w;
      const y = (idx / w) | 0;
      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
    }

    // Optional: soften edges (1px feather)
    // Simple pass to reduce hard aliased edges
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const off = idx * 4;
        if (data[off + 3] === 0) continue;
        // If any neighbor transparent, slightly reduce alpha
        const neighbors =
          data[((y - 1) * w + x) * 4 + 3] === 0 ||
          data[((y + 1) * w + x) * 4 + 3] === 0 ||
          data[(y * w + (x - 1)) * 4 + 3] === 0 ||
          data[(y * w + (x + 1)) * 4 + 3] === 0;
        if (neighbors) {
          data[off + 3] = Math.max(0, data[off + 3] - 60);
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  const modalTitle = category === "tops" ? "Try on Top" : "Try on Bottom";

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 2000,
      }}
    >
      <div
        className="modal-window window"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "980px",
          maxWidth: "98vw",
          height: "760px",
          maxHeight: "96vh",
          display: "flex",
          flexDirection: "column",
          background: "#c0c0c0",
        }}
      >
        <div className="title-bar">
          <div className="title-bar-text">{modalTitle}</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose}></button>
          </div>
        </div>
        <div
          className="window-body"
          style={{
            display: "flex",
            gap: "8px",
            height: "100%",
            padding: "8px",
          }}
        >
          {/* Left: Video or Captured Image with crop overlay */}
          <div
            style={{
              flex: 2,
              position: "relative",
              background: "#fff",
              border: "1px solid #999",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {phase === "stream" && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  background: "#000",
                }}
              />
            )}
            {phase === "captured" && imageUrl && (
              <div style={{ position: "relative" }}>
                <img
                  ref={baseImgRef}
                  src={imageUrl}
                  alt="Captured"
                  onLoad={handleBaseImageLoad}
                  style={{
                    width: displaySize.w ? `${displaySize.w}px` : "auto",
                    height: displaySize.h ? `${displaySize.h}px` : "auto",
                    objectFit: "contain",
                    display: "block",
                    background: "#fff",
                  }}
                />
                <div
                  ref={overlayRef}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: displaySize.w ? `${displaySize.w}px` : "0px",
                    height: displaySize.h ? `${displaySize.h}px` : "0px",
                    cursor: dragMode ? "grabbing" : "crosshair",
                  }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  {/* Darken outside selection */}
                  {rect && (
                    <>
                      <svg
                        width={displaySize.w}
                        height={displaySize.h}
                        style={{ position: "absolute", left: 0, top: 0 }}
                      >
                        <defs>
                          <mask id="cutout">
                            <rect
                              x="0"
                              y="0"
                              width={displaySize.w}
                              height={displaySize.h}
                              fill="white"
                            />
                            {/* Selection hole */}
                            <rect
                              x={
                                (rect.x /
                                  (baseImgRef.current?.naturalWidth || 1)) *
                                displaySize.w
                              }
                              y={
                                (rect.y /
                                  (baseImgRef.current?.naturalHeight || 1)) *
                                displaySize.h
                              }
                              width={
                                (rect.w /
                                  (baseImgRef.current?.naturalWidth || 1)) *
                                displaySize.w
                              }
                              height={
                                (rect.h /
                                  (baseImgRef.current?.naturalHeight || 1)) *
                                displaySize.h
                              }
                              fill="black"
                            />
                          </mask>
                        </defs>
                        <rect
                          x="0"
                          y="0"
                          width={displaySize.w}
                          height={displaySize.h}
                          fill="rgba(0,0,0,0.5)"
                          mask="url(#cutout)"
                        />
                        {/* Border */}
                        <rect
                          x={
                            (rect.x / (baseImgRef.current?.naturalWidth || 1)) *
                            displaySize.w
                          }
                          y={
                            (rect.y /
                              (baseImgRef.current?.naturalHeight || 1)) *
                            displaySize.h
                          }
                          width={
                            (rect.w / (baseImgRef.current?.naturalWidth || 1)) *
                            displaySize.w
                          }
                          height={
                            (rect.h /
                              (baseImgRef.current?.naturalHeight || 1)) *
                            displaySize.h
                          }
                          fill="none"
                          stroke="#00a"
                          strokeWidth="2"
                        />
                      </svg>
                      {/* Handles */}
                      {["nw", "ne", "sw", "se"].map((k) => {
                        const iw = baseImgRef.current?.naturalWidth || 1;
                        const ih = baseImgRef.current?.naturalHeight || 1;
                        const sx = rect.x / iw;
                        const sy = rect.y / ih;
                        const ex = (rect.x + rect.w) / iw;
                        const ey = (rect.y + rect.h) / ih;
                        const map: Record<
                          string,
                          { left: number; top: number }
                        > = {
                          nw: {
                            left: sx * displaySize.w - 4,
                            top: sy * displaySize.h - 4,
                          },
                          ne: {
                            left: ex * displaySize.w - 4,
                            top: sy * displaySize.h - 4,
                          },
                          sw: {
                            left: sx * displaySize.w - 4,
                            top: ey * displaySize.h - 4,
                          },
                          se: {
                            left: ex * displaySize.w - 4,
                            top: ey * displaySize.h - 4,
                          },
                        };
                        const pos = map[k];
                        return (
                          <div
                            key={k}
                            style={{
                              position: "absolute",
                              width: 8,
                              height: 8,
                              background: "#fff",
                              border: "1px solid #00a",
                              left: pos.left,
                              top: pos.top,
                              pointerEvents: "none",
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Right: Controls and Preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {error && (
              <div
                className="error-message"
                style={{ color: "#b00", fontSize: "12px" }}
              >
                {error}
              </div>
            )}
            {phase === "stream" && (
              <div
                className="field-row"
                style={{ display: "flex", gap: "8px" }}
              >
                <button onClick={captureFrame} disabled={!canCapture}>
                  Capture Frame
                </button>
                <button onClick={onClose}>Cancel</button>
              </div>
            )}
            {phase === "captured" && (
              <>
                <div
                  className="groupbox"
                  style={{ border: "1px solid #999", padding: "8px" }}
                >
                  <div style={{ marginBottom: "6px", fontSize: "12px" }}>
                    Selection Preview
                  </div>
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      background: "#eee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "1px inset #c0c0c0",
                    }}
                  >
                    {previewDataUrl ? (
                      <img
                        src={previewDataUrl}
                        alt="Preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          imageRendering: "auto",
                        }}
                      />
                    ) : (
                      <span style={{ color: "#666", fontSize: "12px" }}>
                        Drag to select an area
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="field-row"
                  style={{ display: "flex", gap: "8px" }}
                >
                  <button
                    onClick={() => {
                      // Reset selection
                      setRect(null);
                    }}
                  >
                    Clear Selection
                  </button>
                  <button
                    disabled={!rect}
                    onClick={async () => {
                      await handleConfirm();
                      onClose();
                    }}
                  >
                    Confirm
                  </button>
                  <button onClick={onClose}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
