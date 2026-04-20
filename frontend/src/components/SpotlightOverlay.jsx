import { useCursorSpotlight } from "../hooks/useCursorSpotlight";

// Fixed, pointer-events:none overlay. Mounts once in App.jsx.
// Creates a subtle radial spotlight that follows the cursor.
const SpotlightOverlay = () => {
  const overlayRef = useCursorSpotlight();

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9998,
        // initial state before first mouse move — no effect visible
        background: "transparent",
      }}
    />
  );
};

export default SpotlightOverlay;