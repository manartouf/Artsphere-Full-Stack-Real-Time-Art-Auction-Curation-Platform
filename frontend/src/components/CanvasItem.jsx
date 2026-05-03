import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMagneticEffect } from "../hooks/useMagneticEffect";

// Wraps a single artwork on the infinite canvas.
// Handles double-click focus zoom + navigation on single click.
// position: absolute — placed at (x, y) in canvas space.
const CanvasItem = ({ art, x, y, onDoubleFocus }) => {
  const navigate   = useNavigate();
  const magneticRef = useMagneticEffect({ strength: 0.18, radius: 160, maxTrans: 4, maxRotate: 2 });
  const clickTimer  = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    // Distinguish single vs double click without the 300ms delay feeling bad
    if (clickTimer.current) {
      // Double click — focus zoom
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onDoubleFocus(x + 100, y + 130); // canvas-space center of card
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        navigate(`/art/${art._id}`);
      }, 220);
    }
  };

  const isSold          = art.isSold;
  const isLiveAuction   = art.isAuction && !art.isSold && art.status === "approved";
  const displayImage    = art.imageUrl || art.image || "https://via.placeholder.com/200x160?text=Art";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top:  y,
        width: "200px",
        userSelect: "none",
      }}
      onClick={handleClick}
    >
      {/* Magnetic wrapper */}
      <div
        ref={magneticRef}
        style={{ willChange: "transform", transformStyle: "preserve-3d" }}
      >
        {/* Card */}
        <div
          className="group"
          style={{
            background: "#1a1a2e",
            border: isLiveAuction
              ? "1.5px solid rgba(74,222,128,0.5)"
              : "1.5px solid rgba(108,52,131,0.25)",
            borderRadius: "12px",
            overflow: "hidden",
            cursor: "pointer",
            transition: "border-color 0.25s, box-shadow 0.25s",
            // Golden glow — always subtle, intensifies on hover
            boxShadow: isLiveAuction
              ? "0 0 18px rgba(74,222,128,0.15), 0 8px 32px rgba(0,0,0,0.6)"
              : "0 0 18px rgba(212,168,67,0.12), 0 8px 32px rgba(0,0,0,0.6)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = isLiveAuction
              ? "0 0 32px rgba(74,222,128,0.35), 0 12px 40px rgba(0,0,0,0.7)"
              : "0 0 32px rgba(212,168,67,0.3), 0 12px 40px rgba(0,0,0,0.7)";
            e.currentTarget.style.borderColor = isLiveAuction
              ? "rgba(74,222,128,0.8)"
              : "rgba(212,168,67,0.5)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = isLiveAuction
              ? "0 0 18px rgba(74,222,128,0.15), 0 8px 32px rgba(0,0,0,0.6)"
              : "0 0 18px rgba(212,168,67,0.12), 0 8px 32px rgba(0,0,0,0.6)";
            e.currentTarget.style.borderColor = isLiveAuction
              ? "rgba(74,222,128,0.5)"
              : "rgba(108,52,131,0.25)";
          }}
        >
          {/* Image */}
          <div style={{ position: "relative", height: "140px", overflow: "hidden" }}>
            <img
              src={displayImage}
              alt={art.title}
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                filter: isSold ? "grayscale(60%) brightness(0.7)" : "none",
                transition: "filter 0.3s",
              }}
            />
            {/* SOLD stamp */}
            {isSold && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.45)",
              }}>
                <span style={{
                  color: "#ef4444", fontWeight: 900, fontSize: "1.1rem",
                  border: "2px solid #ef4444", padding: "2px 10px",
                  transform: "rotate(-12deg)", letterSpacing: "1px",
                }}>SOLD</span>
              </div>
            )}
            {/* Live badge */}
            {isLiveAuction && (
              <div style={{
                position: "absolute", top: 6, left: 6,
                background: "rgba(20,60,20,0.9)", border: "1px solid rgba(74,222,128,0.6)",
                color: "#4ade80", fontSize: "0.6rem", fontWeight: 700,
                padding: "2px 7px", borderRadius: "999px",
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", background: "#4ade80",
                  animation: "pulse 1.5s infinite",
                }} />
                LIVE
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ padding: "10px 12px" }}>
            <p style={{
              color: "#fff", fontWeight: 700, fontSize: "0.8rem",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              marginBottom: 3,
            }}>
              {art.title}
            </p>
            <p style={{ color: "#9ca3af", fontSize: "0.7rem", marginBottom: 4 }}>
              {art.artist?.name || "Unknown"}
            </p>
            <p style={{
              color: isLiveAuction ? "#4ade80" : "#a855f7",
              fontWeight: 700, fontSize: "0.75rem",
            }}>
              {isLiveAuction
                ? `Bid: $${art.currentBid || art.auctionStartPrice || 0}`
                : isSold
                  ? `Sold: $${art.soldPrice}`
                  : `$${art.price}`
              }
            </p>
          </div>
        </div>

        {/* Double-click hint tooltip */}
        <p style={{
          textAlign: "center", color: "rgba(255,255,255,0.2)",
          fontSize: "0.6rem", marginTop: 4,
        }}>
          double-click to focus · click to view
        </p>
      </div>
    </div>
  );
};

export default CanvasItem;