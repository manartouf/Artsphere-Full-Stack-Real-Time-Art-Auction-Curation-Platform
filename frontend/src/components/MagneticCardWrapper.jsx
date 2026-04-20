import { useMagneticEffect } from "../hooks/useMagneticEffect";

// Wraps any card with a gentle magnetic-toward-cursor effect.
// Outer wrapper handles transform; inner children keep their own hover styles.
const MagneticCardWrapper = ({ children, className = "", style = {} }) => {
  const ref = useMagneticEffect({ strength: 0.22, radius: 200, maxTrans: 5, maxRotate: 2.5 });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        willChange: "transform",
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default MagneticCardWrapper;