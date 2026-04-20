import { useEffect, useRef } from "react";

// Tracks cursor position via pointermove + rAF loop.
// Updates the overlay element's background directly (NO state = no re-renders).
export const useCursorSpotlight = () => {
  const overlayRef = useRef(null);
  const posRef    = useRef({ x: -9999, y: -9999 });
  const rafRef    = useRef(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      const { x, y } = posRef.current;
      overlay.style.background =
        `radial-gradient(circle 420px at ${x}px ${y}px, transparent 90%, rgba(15,15,15,0.20) 100%)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return overlayRef;
};