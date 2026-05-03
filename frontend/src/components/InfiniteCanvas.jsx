import { useCallback } from "react";
import { useCanvasControls } from "../hooks/useCanvasControls";
import CanvasItem from "./CanvasItem";

// Positions artworks in a grid-ish scattered layout on the canvas.
// The canvas div is large (5000x3000) — the viewport clips it.
// Pan + zoom are handled entirely via CSS transforms (no re-renders).

const CARD_W = 200;
const CARD_H = 220; // approx card height including label

// Scatter artworks across the canvas in a relaxed grid with offsets
const getPositions = (artworks) => {
  const cols    = 5;
  const gapX    = 280;
  const gapY    = 300;
  const startX  = 200;
  const startY  = 200;

  return artworks.map((art, i) => {
    const col     = i % cols;
    const row     = Math.floor(i / cols);
    // Alternating row offsets for a staggered feel
    const offsetX = row % 2 === 1 ? 40 : 0;
    // Small pseudo-random jitter per card (deterministic, not truly random)
    const jitterX = ((i * 137) % 60) - 30;
    const jitterY = ((i * 97)  % 50) - 25;

    return {
      art,
      x: startX + col * gapX + offsetX + jitterX,
      y: startY + row * gapY + jitterY,
    };
  });
};

const InfiniteCanvas = ({ artworks }) => {
  const { containerRef, canvasRef, focusOnPoint } = useCanvasControls({
    minZoom: 0.3,
    maxZoom: 2.5,
    zoomSensitivity: 0.0008,
  });

  const positions = getPositions(artworks);

  const handleFocus = useCallback((cx, cy) => {
    focusOnPoint(cx, cy, 1.6);
  }, [focusOnPoint]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "70vh",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 50% 50%, #0f0f1e 0%, #080810 100%)",
        borderRadius: "16px",
        border: "1px solid rgba(108,52,131,0.2)",
        // Subtle grid pattern for depth feel
        backgroundImage: `
          radial-gradient(ellipse at 50% 50%, #0f0f1e 0%, #080810 100%),
          linear-gradient(rgba(108,52,131,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(108,52,131,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 60px 60px, 60px 60px",
      }}
    >
      {/* Zoom hint */}
      <div style={{
        position: "absolute", bottom: 16, right: 16,
        color: "rgba(255,255,255,0.25)", fontSize: "0.7rem",
        pointerEvents: "none", zIndex: 10, textAlign: "right", lineHeight: 1.6,
      }}>
        scroll to zoom · drag to pan
      </div>

      {/* Mini zoom indicator */}
      <div style={{
        position: "absolute", bottom: 16, left: 16,
        display: "flex", gap: 6, zIndex: 10,
      }}>
        {[0.5, 1, 1.5, 2].map(z => (
          <button
            key={z}
            onClick={() => focusOnPoint(1200, 900, z)}
            style={{
              background: "rgba(108,52,131,0.3)",
              border: "1px solid rgba(108,52,131,0.4)",
              color: "#c084fc", fontSize: "0.65rem", fontWeight: 700,
              padding: "3px 8px", borderRadius: "6px", cursor: "pointer",
            }}
          >
            {z}×
          </button>
        ))}
      </div>

      {/* THE CANVAS — transform applied here */}
      <div
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "4000px",
          height: "3000px",
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {positions.map(({ art, x, y }) => (
          <CanvasItem
            key={art._id}
            art={art}
            x={x}
            y={y}
            onDoubleFocus={handleFocus}
          />
        ))}
      </div>
    </div>
  );
};

export default InfiniteCanvas;