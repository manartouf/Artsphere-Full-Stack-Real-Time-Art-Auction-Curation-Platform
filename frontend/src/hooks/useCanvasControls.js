import { useRef, useEffect, useCallback } from "react";

// Handles all zoom + pan logic for the infinite canvas.
// Uses refs for live values — NO state on mouse/wheel events.
// Only commits transform to DOM via rAF.
export const useCanvasControls = ({
  minZoom = 0.4,
  maxZoom = 2.8,
  zoomSensitivity = 0.001,
} = {}) => {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);

  // Live transform values — never stored in state
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging   = useRef(false);
  const dragStart    = useRef({ x: 0, y: 0 });
  const rafPending   = useRef(false);

  const applyTransform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y, scale } = transformRef.current;
    canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  const scheduleApply = useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      applyTransform();
      rafPending.current = false;
    });
  }, [applyTransform]);

  // Zoom toward cursor position
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const t = transformRef.current;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(maxZoom, Math.max(minZoom, t.scale + delta * t.scale));
    const scaleRatio = newScale / t.scale;

    // Zoom toward cursor: adjust translation so point under cursor stays fixed
    transformRef.current = {
      scale: newScale,
      x: mouseX - scaleRatio * (mouseX - t.x),
      y: mouseY - scaleRatio * (mouseY - t.y),
    };

    scheduleApply();
  }, [minZoom, maxZoom, zoomSensitivity, scheduleApply]);

  const handleMouseDown = useCallback((e) => {
    // Only pan on left click, not on card clicks
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y,
    };
    const container = containerRef.current;
    if (container) container.style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    transformRef.current.x = e.clientX - dragStart.current.x;
    transformRef.current.y = e.clientY - dragStart.current.y;
    scheduleApply();
  }, [scheduleApply]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    const container = containerRef.current;
    if (container) container.style.cursor = "grab";
  }, []);

  // Double-click: smoothly zoom into a specific canvas-space point
  const focusOnPoint = useCallback((canvasX, canvasY, targetScale = 1.8) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const viewCenterX = rect.width / 2;
    const viewCenterY = rect.height / 2;

    const t = transformRef.current;
    const clampedScale = Math.min(maxZoom, Math.max(minZoom, targetScale));

    // Animate smoothly using rAF lerp
    const startScale = t.scale;
    const endScale   = clampedScale;
    const startX     = t.x;
    const startY     = t.y;
    const endX       = viewCenterX - canvasX * clampedScale;
    const endY       = viewCenterY - canvasY * clampedScale;

    const duration   = 420; // ms
    const startTime  = performance.now();

    const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut

    const animate = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = ease(progress);

      transformRef.current = {
        scale: startScale + (endScale - startScale) * eased,
        x:     startX + (endX - startX) * eased,
        y:     startY + (endY - startY) * eased,
      };
      applyTransform();

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [minZoom, maxZoom, applyTransform]);

  // Attach/detach events on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.style.cursor = "grab";

    container.addEventListener("wheel",     handleWheel,     { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove",    handleMouseMove, { passive: true });
    window.addEventListener("mouseup",      handleMouseUp);

    return () => {
      container.removeEventListener("wheel",     handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove",    handleMouseMove);
      window.removeEventListener("mouseup",      handleMouseUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  return { containerRef, canvasRef, focusOnPoint, transformRef };
};