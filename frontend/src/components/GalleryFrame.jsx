import { useRef } from "react";
import { useNavigate } from "react-router-dom";

// Wall sconce with live crackling flame
const WallSconce = ({ side, flickerKey }) => {
  const anim = flickerKey % 2 === 0 ? "flickerA" : "flickerB";
  const dur  = 0.9 + (flickerKey * 0.13) % 0.5;

  return (
    <div style={{
      position: "absolute",
      // sconce sits at eye level, between frames
      top: "50%",
      [side === "left" ? "right" : "left"]: "-44px",
      transform: "translateY(-80px)",
      zIndex: 3,
      pointerEvents: "none",
    }}>
      {/* sconce bracket */}
      <div style={{
        width: "8px", height: "28px",
        background: "linear-gradient(180deg,#8a5a10,#5a3208)",
        margin: "0 auto",
        borderRadius: "0 0 3px 3px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
      }} />

      {/* candle holder cup */}
      <div style={{
        width: "18px", height: "10px",
        background: "linear-gradient(180deg,#9a6412,#6a4008)",
        borderRadius: "2px 2px 5px 5px",
        margin: "0 auto",
        border: "1px solid rgba(160,100,20,0.5)",
      }} />

      {/* candle body */}
      <div style={{
        width: "8px", height: "18px",
        background: "linear-gradient(180deg,#e8d8b0,#c8b080)",
        margin: "0 auto",
        borderRadius: "2px 2px 0 0",
        position: "relative",
      }} />

      {/* flame glow halo */}
      <div style={{
        position: "absolute",
        bottom: "18px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "36px", height: "36px",
        borderRadius: "50%",
        background:
          "radial-gradient(circle,rgba(255,150,30,0.45) 0%,rgba(255,80,0,0.18) 50%,transparent 75%)",
        animation: `glowPulse ${dur + 0.4}s ease-in-out infinite`,
        pointerEvents: "none",
      }} />

      {/* flame — outer */}
      <div style={{
        position: "absolute",
        bottom: "36px",
        left: "50%",
        width: "14px", height: "22px",
        borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
        background:
          "linear-gradient(180deg,#fff4a0 0%,#ffb020 35%,#ff6000 70%,#c02000 100%)",
        boxShadow: "0 0 8px 3px rgba(255,120,20,0.5)",
        animation: `${anim} ${dur}s ease-in-out infinite`,
        pointerEvents: "none",
        transformOrigin: "50% 100%",
      }} />

      {/* flame — inner bright core */}
      <div style={{
        position: "absolute",
        bottom: "36px",
        left: "50%",
        marginLeft: "-3px",
        width: "6px", height: "10px",
        borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
        background:
          "linear-gradient(180deg,#ffffff 0%,#fff4a0 60%,#ffcc40 100%)",
        animation: `${anim === "flickerA" ? "flickerB" : "flickerA"} ${dur * 0.7}s ease-in-out infinite`,
        pointerEvents: "none",
        transformOrigin: "50% 100%",
      }} />
    </div>
  );
};

// ── Main GalleryFrame ─────────────────────────────────────
const GalleryFrame = ({ art, index, zPos, side, onDoubleClick }) => {
  const navigate  = useNavigate();
  const frameRef  = useRef(null);

  const xOffset = side === "left" ? -370 : 370;
  const rotY    = side === "left" ?   16  : -16;
  const yJitter = [0, -8, 6, -4, 8, -6, 3, -3, 5, -5][index % 10];

  const handleClick    = (e) => { e.stopPropagation(); navigate(`/art/${art._id}`); };
  const handleDblClick = (e) => { e.stopPropagation(); onDoubleClick(); };

  const image = art.imageUrl || art.image
    || "https://via.placeholder.com/220x170?text=Artwork";

  return (
    <div
      ref={frameRef}
      style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: `
          translate(-50%, calc(-50% + ${yJitter}px))
          translateZ(${-zPos}px)
          translateX(${xOffset}px)
          rotateY(${rotY}deg)
        `,
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {/* ── Wall column divider beside frame ── */}
      <div style={{
        position: "absolute",
        top: "-40px",
        [side === "left" ? "right" : "left"]: "-26px",
        width: "12px",
        height: "calc(100% + 80px)",
        background:
          "linear-gradient(90deg,#180802,#2c1206,#180802)",
        borderLeft:  side === "left"  ? "1px solid rgba(140,80,10,0.28)" : "none",
        borderRight: side === "right" ? "1px solid rgba(140,80,10,0.28)" : "none",
        zIndex: 0,
      }}>
        {/* column capital */}
        <div style={{
          position: "absolute", top: 0,
          left: "-5px", right: "-5px",
          height: "10px",
          background: "linear-gradient(180deg,#a06818,#6a4010)",
          borderRadius: "2px 2px 0 0",
        }} />
        {/* column base */}
        <div style={{
          position: "absolute", bottom: 0,
          left: "-5px", right: "-5px",
          height: "8px",
          background: "linear-gradient(0deg,#a06818,#6a4010)",
        }} />
      </div>

      {/* ── Wall sconce with flame ── */}
      <WallSconce side={side} flickerKey={index} />

      {/* ── Frame glow halo on wall ── */}
      <div style={{
        position: "absolute",
        inset: "-30px",
        borderRadius: "8px",
        background:
          "radial-gradient(ellipse at center,rgba(200,130,30,0.22) 0%,transparent 68%)",
        pointerEvents: "none",
        animation: `glowPulse ${2.2 + (index % 3) * 0.4}s ease-in-out infinite`,
      }} />

      {/* ── Velvet wall panel behind frame ── */}
      <div style={{
        position: "absolute",
        inset: "-22px",
        background:
          "linear-gradient(135deg,#2a0808 0%,#1e0505 50%,#280707 100%)",
        borderRadius: "4px",
        border: "1px solid rgba(140,70,10,0.18)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* ── CLICK TARGET ── */}
      <div
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        style={{ cursor: "pointer", position: "relative", zIndex: 2 }}
      >
        {/* ── Outer ornate baroque gold frame ── */}
        <div style={{
          padding: "9px",
          background: `
            linear-gradient(145deg,
              #d4a843 0%,#8b6210 8%,
              #c8982c 18%,#f0c860 26%,
              #9a7018 36%,#d0a03a 46%,
              #7a5010 56%,#c89028 66%,
              #e8be58 74%,#9a7020 84%,
              #d4a843 100%
            )
          `,
          borderRadius: "5px",
          boxShadow: `
            0 0 0 1px rgba(220,170,50,0.40),
            0 0 18px rgba(190,130,30,0.35),
            0 0 50px rgba(190,130,30,0.14),
            0 20px 60px rgba(0,0,0,0.90),
            inset 0 1px 0 rgba(255,240,180,0.25)
          `,
        }}>
          {/* decorative inner relief border */}
          <div style={{
            padding: "4px",
            background: `
              linear-gradient(145deg,
                #5a3208 0%,#2e1804 30%,#4a2808 60%,#2a1604 100%
              )
            `,
            borderRadius: "3px",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7)",
          }}>
            {/* ── Artwork image ── */}
            <div style={{
              width: "220px",
              height: "170px",
              overflow: "hidden",
              borderRadius: "2px",
              position: "relative",
            }}>
              <img
                src={image}
                alt={art.title}
                draggable={false}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover", display: "block",
                  transition: "filter 0.35s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.18) saturate(1.1)"}
                onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
              />
              {/* inner frame vignette */}
              <div style={{
                position: "absolute", inset: 0,
                boxShadow: "inset 0 0 32px rgba(0,0,0,0.55)",
                pointerEvents: "none",
              }} />
              {/* Sold overlay */}
              {art.isSold && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.52)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    color: "#c03030",
                    fontWeight: 900,
                    fontSize: "1.4rem",
                    border: "3px solid #c03030",
                    padding: "2px 14px",
                    transform: "rotate(-14deg)",
                    letterSpacing: "2px",
                    fontFamily: "Georgia,serif",
                  }}>
                    SOLD
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Nameplate ── */}
        <div style={{
          marginTop: "11px",
          textAlign: "center",
          padding: "6px 14px",
          background: "linear-gradient(145deg,#1c1008,#100a04)",
          border: "1px solid rgba(180,120,30,0.28)",
          borderRadius: "4px",
          boxShadow:
            "0 4px 18px rgba(0,0,0,0.7), 0 0 8px rgba(180,100,20,0.08)",
          maxWidth: "238px",
        }}>
          <p style={{
            color: "rgba(255,230,160,0.90)",
            fontWeight: 700,
            fontSize: "10.5px",
            letterSpacing: "1.4px",
            fontFamily: "Georgia,serif",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textTransform: "uppercase",
          }}>
            {art.title}
          </p>
          <p style={{
            color: "rgba(220,170,80,0.50)",
            fontSize: "9.5px",
            marginTop: "3px",
            fontStyle: "italic",
            fontFamily: "Georgia,serif",
          }}>
            {art.artist?.name || "Unknown Artist"}
          </p>
          {art.isAuction && !art.isSold && (
            <p style={{
              color: "rgba(80,200,100,0.75)",
              fontSize: "9px",
              marginTop: "2px",
              fontWeight: 700,
              letterSpacing: "1px",
            }}>
              ● LIVE AUCTION
            </p>
          )}
        </div>

        {/* ── Spotlight cone from ceiling ── */}
        <div style={{
          position: "absolute",
          top: "-100px",
          left: "50%",
          width: 0, height: 0,
          borderLeft: "60px solid transparent",
          borderRight: "60px solid transparent",
          borderTop: "100px solid rgba(220,150,40,0.055)",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          filter: "blur(4px)",
        }} />
      </div>
    </div>
  );
};

export default GalleryFrame;