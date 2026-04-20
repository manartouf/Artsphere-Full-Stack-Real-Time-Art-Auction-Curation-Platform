import { useEffect, useRef } from "react";

// Proximity-based magnetic card effect.
// Moves card toward cursor when within `radius` pixels.
// Uses rAF loop with lerp — NO state, NO re-renders.
export const useMagneticEffect = ({
  strength    = 0.22,
  radius      = 220,
  maxTrans    = 6,
  maxRotate   = 3,
} = {}) => {
  const cardRef    = useRef(null);
  const rafRef     = useRef(null);
  const targetRef  = useRef({ x: 0, y: 0, rx: 0, ry: 0 });
  const currentRef = useRef({ x: 0, y: 0, rx: 0, ry: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const tick = () => {
      const c = currentRef.current;
      const g = targetRef.current;
      const sp = 0.10; // lerp speed

      c.x  = lerp(c.x,  g.x,  sp);
      c.y  = lerp(c.y,  g.y,  sp);
      c.rx = lerp(c.rx, g.rx, sp);
      c.ry = lerp(c.ry, g.ry, sp);

      card.style.transform =
        `translate(${c.x}px, ${c.y}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    const onMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        const f = (1 - dist / radius) * strength;
        targetRef.current = {
          x:  clamp(dx * f,           -maxTrans,  maxTrans),
          y:  clamp(dy * f,           -maxTrans,  maxTrans),
          rx: clamp(-(dy / radius) * maxRotate * f * 10, -maxRotate, maxRotate),
          ry: clamp( (dx / radius) * maxRotate * f * 10, -maxRotate, maxRotate),
        };
      } else {
        targetRef.current = { x: 0, y: 0, rx: 0, ry: 0 };
      }
    };

    const onMouseLeave = () => {
      targetRef.current = { x: 0, y: 0, rx: 0, ry: 0 };
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    card.addEventListener("mouseleave", onMouseLeave);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (card) card.removeEventListener("mouseleave", onMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [strength, radius, maxTrans, maxRotate]);

  return cardRef;
};