import { useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════════════════════════════════
// PHYSICS & GEOMETRY — UNTOUCHED
// ═══════════════════════════════════════════════════════════════════
const FL        = 640;
const SPACING   = 820;
const WALL_X    = 390;
const VANISH_Y  = 0.30;   // low horizon → very tall ceiling
const NEAR      = 60;
const FAR       = 7000;
const VEL_ACCEL = 0.017;
const VEL_DAMP  = 0.81;
const SWAY_MAX  = 14;
const BOB_MAX   = 8;
const CAM_SPD   = 1.15;

// ═══════════════════════════════════════════════════════════════════
// ROYAL BAROQUE PALETTE
// Deep crimson walls, antique gold trim, warm amber lighting
// ═══════════════════════════════════════════════════════════════════
const C = {
  // walls
  wallNear:   "#3a0a10",   // darkest near viewer
  wallMid:    "#5a1018",   // mid-depth crimson
  wallFar:    "#7a1c2a",   // bright far crimson (receding)
  // gold trim
  gold:       "#c8a030",
  goldHi:     "#e8c860",
  goldShadow: "#7a5c10",
  goldDark:   "#503c08",
  // amber warm light
  amber:      "#ffcc88",
  amberDeep:  "#e8a040",
  amberGlow:  "rgba(255,200,100,",   // append opacity
  // floor
  floorNear:  "#2a1808",
  floorMid:   "#5a3c18",
  floorFar:   "#8a6030",
  // ceiling
  ceilNear:   "#1e0a0e",
  ceilMid:    "#2e1016",
  ceilFar:    "#481820",
  // columns
  col:        "#1a0a06",
  colHi:      "#3a1c0c",
  // bg base
  bg:         "#1c0608",
};

// ═══════════════════════════════════════════════════════════════════
// CSS KEYFRAMES
// ═══════════════════════════════════════════════════════════════════
const STYLE_ID = "hwg-baroque-v1";
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes hwg-fa {
      0%,100%{opacity:1;   transform:scaleX(1)    scaleY(1)    translateX(-50%);}
      18%    {opacity:.70; transform:scaleX(.86)  scaleY(1.16) translateX(-50%);}
      38%    {opacity:.88; transform:scaleX(1.12) scaleY(.90)  translateX(-50%);}
      58%    {opacity:.62; transform:scaleX(.82)  scaleY(1.20) translateX(-50%);}
      78%    {opacity:.84; transform:scaleX(1.10) scaleY(.91)  translateX(-50%);}
    }
    @keyframes hwg-fb {
      0%,100%{opacity:.86; transform:scaleX(1)    scaleY(1)    translateX(-50%);}
      22%    {opacity:.58; transform:scaleX(1.14) scaleY(.88)  translateX(-50%);}
      46%    {opacity:.82; transform:scaleX(.87)  scaleY(1.14) translateX(-50%);}
      66%    {opacity:.54; transform:scaleX(1.12) scaleY(.90)  translateX(-50%);}
      86%    {opacity:.86; transform:scaleX(.90)  scaleY(1.12) translateX(-50%);}
    }
    @keyframes hwg-flameglow {
      0%,100%{opacity:.42;} 50%{opacity:.80;}
    }
    @keyframes hwg-chandglow {
      0%,100%{opacity:.50;} 50%{opacity:.88;}
    }
    @keyframes hwg-archglow {
      0%,100%{opacity:.46; box-shadow:0 0 22px rgba(200,160,48,.20);}
      50%    {opacity:.90; box-shadow:0 0 48px rgba(200,160,48,.44);}
    }
    @keyframes hwg-vpglow {
      0%,100%{opacity:.40;} 50%{opacity:.78;}
    }
    @keyframes hwg-bob {
      0%,100%{opacity:.48; transform:translateX(-50%) translateY(0);}
      50%    {opacity:.14; transform:translateX(-50%) translateY(8px);}
    }
    @keyframes hwg-shimmer {
      0%   {opacity:0; left:-60%;}
      40%  {opacity:.14;}
      100% {opacity:0; left:160%;}
    }
  `;
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════════
// FLAME — realistic candle flame
// ═══════════════════════════════════════════════════════════════════
function Flame({ seed = 0 }) {
  const d  = +(0.72 + (seed * 0.19) % 0.58).toFixed(2);
  const d2 = +(d * 0.64).toFixed(2);
  const A  = seed % 2 === 0 ? "hwg-fa" : "hwg-fb";
  const B  = seed % 2 === 0 ? "hwg-fb" : "hwg-fa";
  return (
    <div style={{ position: "relative", width: "10px", height: "20px", margin: "0 auto" }}>
      {/* outer glow halo */}
      <div style={{
        position: "absolute", bottom: "-2px", left: "50%",
        transform: "translateX(-50%)",
        width: "30px", height: "30px", borderRadius: "50%",
        background: "radial-gradient(circle,rgba(255,180,40,.52) 0%,rgba(255,90,0,.16) 54%,transparent 72%)",
        animation: `hwg-flameglow ${(+d + .55).toFixed(2)}s ease-in-out infinite`,
        pointerEvents: "none",
      }} />
      {/* outer flame body */}
      <div style={{
        position: "absolute", bottom: 0, left: "50%",
        width: "10px", height: "18px",
        borderRadius: "50% 50% 28% 28% / 58% 58% 42% 42%",
        background: "linear-gradient(180deg,#fff9c8 0%,#ffb828 26%,#ff5200 62%,#c81400 100%)",
        boxShadow: "0 0 8px 2px rgba(255,120,14,.50)",
        animation: `${A} ${d}s ease-in-out infinite`,
        transformOrigin: "50% 100%", pointerEvents: "none",
      }} />
      {/* inner bright core */}
      <div style={{
        position: "absolute", bottom: "2px", left: "50%",
        width: "4px", height: "9px",
        borderRadius: "50% 50% 28% 28% / 55% 55% 45% 45%",
        background: "linear-gradient(180deg,#fff 0%,#fffbd0 52%,#ffcd3a 100%)",
        animation: `${B} ${d2}s ease-in-out infinite`,
        transformOrigin: "50% 100%", pointerEvents: "none",
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CANDLE WALL SCONCE
// Realistic bracket arm, candle body, flame — mounts to wall
// ═══════════════════════════════════════════════════════════════════
function WallSconce({ seed = 0 }) {
  return (
    <div style={{ pointerEvents: "none", position: "relative", textAlign: "center" }}>

      {/* ── Backplate — oval mounting plaque on wall ── */}
      <div style={{
        width: "18px", height: "32px",
        background: `linear-gradient(180deg,${C.goldHi},${C.gold},${C.goldShadow})`,
        borderRadius: "9px 9px 4px 4px",
        margin: "0 auto",
        border: `1px solid rgba(240,200,96,.45)`,
        boxShadow: "inset 0 1px 0 rgba(255,250,180,.35), 0 2px 6px rgba(0,0,0,.55)",
        position: "relative",
      }}>
        {/* engraved oval relief on backplate */}
        <div style={{
          position: "absolute", top: "5px", left: "50%",
          transform: "translateX(-50%)",
          width: "10px", height: "18px",
          borderRadius: "5px",
          border: `1px solid rgba(255,230,140,.30)`,
          opacity: 0.7,
        }} />
      </div>

      {/* ── Horizontal bracket arm extending from wall ── */}
      <div style={{
        width: "22px", height: "5px",
        background: `linear-gradient(180deg,${C.goldHi},${C.gold},${C.goldShadow})`,
        margin: "0 auto",
        borderRadius: "0 2px 2px 0",
        boxShadow: "0 2px 4px rgba(0,0,0,.50)",
        position: "relative",
      }}>
        {/* decorative curl at tip of arm */}
        <div style={{
          position: "absolute", right: "-2px", top: "-3px",
          width: "6px", height: "10px",
          borderRadius: "0 3px 3px 0",
          border: `1px solid ${C.goldHi}`,
          borderLeft: "none",
          opacity: 0.7,
        }} />
      </div>

      {/* ── Bobeche cup — holds candle ── */}
      <div style={{
        width: "14px", height: "6px",
        background: `linear-gradient(180deg,${C.goldHi},${C.gold})`,
        borderRadius: "50%",
        margin: "0 auto",
        boxShadow: "0 1px 4px rgba(0,0,0,.50)",
        border: `1px solid rgba(240,200,80,.40)`,
      }} />

      {/* ── Candle body ── */}
      <div style={{
        width: "7px", height: "18px",
        background: "linear-gradient(180deg,#f5f0e0,#ddd0a8,#c8b880)",
        margin: "0 auto",
        borderRadius: "3px 3px 0 0",
        boxShadow: "inset 1px 0 0 rgba(255,255,255,.22)",
      }} />

      {/* ── Live flame ── */}
      <Flame seed={seed} />

      {/* ── Warm light cast on wall behind sconce ── */}
      <div style={{
        position: "absolute",
        top: "10px", left: "50%",
        transform: "translateX(-50%)",
        width: "70px", height: "80px",
        background: "radial-gradient(ellipse 50% 65% at 50% 40%,rgba(255,180,60,.22) 0%,rgba(255,140,30,.08) 55%,transparent 72%)",
        filter: "blur(8px)",
        pointerEvents: "none",
        animation: `hwg-flameglow ${(0.9 + (seed * 0.13) % 0.5).toFixed(2)}s ease-in-out infinite`,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CEILING CHANDELIER
// Gold metal arms with candles — structural, not fantasy
// Hangs from ceiling on a chain
// ═══════════════════════════════════════════════════════════════════
function Chandelier({ seed = 0 }) {
  const glowDur = (2.8 + (seed * 0.22) % 1.4).toFixed(2);
  // 4 candle arms
  const arms = [-22, -8, 8, 22];
  return (
    <div style={{ pointerEvents: "none", textAlign: "center", position: "relative" }}>

      {/* ── Ceiling mount — square escutcheon ── */}
      <div style={{
        width: "22px", height: "10px",
        background: `linear-gradient(180deg,${C.goldHi},${C.gold},${C.goldDark})`,
        borderRadius: "2px",
        margin: "0 auto",
        border: `1px solid rgba(240,200,80,.40)`,
        boxShadow: "0 1px 6px rgba(0,0,0,.60)",
      }} />

      {/* ── Chain — repeating links ── */}
      <div style={{
        width: "4px", height: "42px",
        background: `repeating-linear-gradient(
          180deg,
          ${C.goldHi} 0px, ${C.gold} 3px,
          ${C.goldShadow} 6px, ${C.gold} 9px
        )`,
        margin: "0 auto",
        borderRadius: "1px",
        boxShadow: "0 0 2px rgba(200,160,40,.18)",
      }} />

      {/* ── Central ring / bobèche ── */}
      <div style={{
        width: "42px", height: "10px",
        borderRadius: "50%",
        background: `linear-gradient(180deg,${C.goldHi},${C.gold},${C.goldDark})`,
        margin: "0 auto",
        border: `1px solid rgba(240,200,80,.45)`,
        boxShadow: `
          0 0 14px rgba(255,180,50,.35),
          0 0 28px rgba(255,160,40,.14),
          inset 0 1px 0 rgba(255,248,180,.30)
        `,
        animation: `hwg-chandglow ${glowDur}s ease-in-out infinite`,
        position: "relative",
      }} />

      {/* ── 4 horizontal arms with candles ── */}
      <div style={{ position: "relative", height: "28px", width: "64px", margin: "0 auto" }}>
        {/* horizontal bar */}
        <div style={{
          position: "absolute", top: "2px", left: 0, right: 0,
          height: "4px",
          background: `linear-gradient(180deg,${C.goldHi},${C.gold},${C.goldShadow})`,
          borderRadius: "2px",
          boxShadow: "0 1px 4px rgba(0,0,0,.45)",
        }} />
        {/* arms with candles */}
        {arms.map((x, i) => (
          <div key={i} style={{ position: "absolute", left: `calc(50% + ${x}px)`, top: 0, transform: "translateX(-50%)" }}>
            {/* vertical arm up to bar */}
            <div style={{
              width: "3px", height: "6px",
              background: `linear-gradient(180deg,${C.gold},${C.goldShadow})`,
              margin: "0 auto",
            }} />
            {/* bobeche */}
            <div style={{
              width: "8px", height: "4px",
              background: `linear-gradient(180deg,${C.goldHi},${C.gold})`,
              borderRadius: "50%",
              margin: "0 auto",
              border: `1px solid rgba(240,200,80,.35)`,
            }} />
            {/* candle */}
            <div style={{
              width: "5px", height: "12px",
              background: "linear-gradient(180deg,#f5f0e0,#ddd0a8)",
              margin: "0 auto",
              borderRadius: "2px 2px 0 0",
            }} />
            {/* tiny flame per arm */}
            <div style={{
              position: "relative", width: "7px", height: "12px", margin: "0 auto",
            }}>
              <div style={{
                position: "absolute", bottom: 0, left: "50%",
                transform: "translateX(-50%)",
                width: "7px", height: "12px",
                borderRadius: "50% 50% 28% 28% / 58% 58% 42% 42%",
                background: "linear-gradient(180deg,#fff9c8 0%,#ffb828 28%,#ff5200 65%,#c81400 100%)",
                boxShadow: "0 0 6px 2px rgba(255,120,14,.45)",
                animation: `hwg-fa ${(0.72 + i * 0.13).toFixed(2)}s ease-in-out infinite`,
                transformOrigin: "50% 100%",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Central pendant drop ── */}
      <div style={{
        width: "12px", height: "18px",
        borderRadius: "50% 50% 40% 40%",
        background: `radial-gradient(ellipse at 38% 32%,${C.goldHi} 0%,${C.gold} 50%,${C.goldDark} 100%)`,
        margin: "0 auto",
        border: `1px solid rgba(240,200,80,.40)`,
        boxShadow: `0 0 8px rgba(255,170,40,.28)`,
      }} />

      {/* ── Warm amber glow pool cast downward ── */}
      <div style={{
        position: "absolute",
        bottom: "-24px", left: "50%",
        transform: "translateX(-50%)",
        width: "110px", height: "50px",
        background: "radial-gradient(ellipse,rgba(255,180,60,.28) 0%,rgba(255,150,40,.10) 50%,transparent 72%)",
        filter: "blur(9px)",
        pointerEvents: "none",
        animation: `hwg-chandglow ${glowDur}s ease-in-out infinite`,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FRAME CONTENT — baroque museum style
// ═══════════════════════════════════════════════════════════════════
function FrameContent({ art, idx }) {
  const image = art.imageUrl || art.image
    || "https://via.placeholder.com/240x188/3a0a10/c8a030?text=Artwork";
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>

      {/* warm amber glow halo on wall panel */}
      <div style={{
        position: "absolute", inset: "-26px", borderRadius: "6px",
        background: "radial-gradient(ellipse at center,rgba(255,170,48,.22) 0%,rgba(220,140,30,.08) 50%,transparent 68%)",
        animation: `hwg-flameglow ${2.2 + (idx % 5) * 0.36}s ease-in-out infinite`,
        pointerEvents: "none",
      }} />

      {/* ── WALL PANEL behind frame — deep crimson with gold molding ── */}
      <div style={{
        position: "absolute", inset: "-20px",
        background: `linear-gradient(148deg,${C.wallNear},${C.wallMid},${C.wallNear})`,
        border: `1px solid rgba(200,160,48,.22)`,
        borderRadius: "4px",
        zIndex: 0, pointerEvents: "none",
        boxShadow: "inset 0 0 18px rgba(0,0,0,.35)",
      }}>
        {/* panel molding — inner gold rule */}
        <div style={{
          position: "absolute", inset: "5px",
          border: `1px solid rgba(200,160,48,.30)`,
          borderRadius: "2px",
          pointerEvents: "none",
        }} />
        {/* corner fillets */}
        {["topLeft","topRight","bottomLeft","bottomRight"].map((pos, i) => (
          <div key={pos} style={{
            position: "absolute",
            ...(pos.includes("top")    ? { top: "5px" }    : { bottom: "5px" }),
            ...(pos.includes("Left")   ? { left: "5px" }   : { right: "5px" }),
            width: "10px", height: "10px",
            borderTop:    pos.includes("top")    ? `1px solid rgba(200,160,48,.42)` : "none",
            borderBottom: pos.includes("bottom") ? `1px solid rgba(200,160,48,.42)` : "none",
            borderLeft:   pos.includes("Left")   ? `1px solid rgba(200,160,48,.42)` : "none",
            borderRight:  pos.includes("Right")  ? `1px solid rgba(200,160,48,.42)` : "none",
            borderRadius: pos === "topLeft" ? "2px 0 0 0"
                        : pos === "topRight" ? "0 2px 0 0"
                        : pos === "bottomLeft" ? "0 0 0 2px"
                        : "0 0 2px 0",
          }} />
        ))}
      </div>

      {/* shimmer sweep — very subtle */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden",
        zIndex: 3, pointerEvents: "none", borderRadius: "4px",
      }}>
        <div style={{
          position: "absolute", top: 0, width: "50%", height: "100%",
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)",
          animation: `hwg-shimmer ${5.5 + (idx % 4) * 1.3}s ease-in-out ${idx * 0.7}s infinite`,
        }} />
      </div>

      {/* ── ORNATE BAROQUE GOLD FRAME ── */}
      <div style={{
        position: "relative", zIndex: 1,
        padding: "calc(var(--fs,0.5) * 11px)",
        background: `linear-gradient(150deg,
          ${C.goldHi}    0%,  ${C.goldDark}   8%,
          ${C.gold}      18%, #f0d470         28%,
          ${C.goldShadow} 37%, ${C.gold}      47%,
          ${C.goldDark}  56%, ${C.gold}       66%,
          #f0d470        75%, ${C.goldShadow} 84%,
          ${C.goldHi}    100%)`,
        borderRadius: "4px",
        boxShadow: `
          0 0 0 1.5px rgba(232,200,96,.42),
          0 0 16px rgba(200,160,48,.30),
          0 0 44px rgba(200,160,48,.10),
          0 22px 60px rgba(0,0,0,.85),
          inset 0 1px 0 rgba(255,248,180,.30)
        `,
        width: "100%", height: "100%", boxSizing: "border-box",
      }}>
        {/* inner dark relief channel */}
        <div style={{
          padding: "calc(var(--fs,0.5) * 4px)",
          background: `linear-gradient(148deg,${C.wallMid},${C.wallNear},${C.wallMid})`,
          borderRadius: "2px",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,.80)",
          width: "100%", height: "100%", boxSizing: "border-box",
        }}>
          {/* image */}
          <div style={{
            width: "100%", height: "100%",
            overflow: "hidden", borderRadius: "1px", position: "relative",
          }}>
            <img
              src={image}
              alt={art.title}
              draggable={false}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover", display: "block",
                transition: "filter .34s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.20) saturate(1.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = ""; }}
            />
            {/* canvas vignette */}
            <div style={{
              position: "absolute", inset: 0,
              boxShadow: "inset 0 0 28px rgba(0,0,0,.52)",
              pointerEvents: "none",
            }} />
            {/* ceiling spotlight cone */}
            <div style={{
              position: "absolute", bottom: "100%", left: "50%",
              transform: "translateX(-50%)",
              width: 0, height: 0,
              borderLeft: "50px solid transparent",
              borderRight: "50px solid transparent",
              borderTop: "80px solid rgba(255,200,100,.07)",
              filter: "blur(5px)", pointerEvents: "none",
            }} />
            {/* SOLD stamp */}
            {art.isSold && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,.52)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  color: "#c02020",
                  fontWeight: 900,
                  fontSize: "calc(var(--fs,0.5) * 28px)",
                  border: "3px solid #c02020",
                  padding: "2px 12px",
                  transform: "rotate(-13deg)",
                  letterSpacing: "2px",
                  fontFamily: "Georgia,serif",
                }}>SOLD</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NAMEPLATE — dark bronze plaque ── */}
      <div style={{
        position: "absolute",
        top: "calc(100% + calc(var(--fs,0.5) * 11px))",
        left: "50%", transform: "translateX(-50%)",
        textAlign: "center",
        padding: "calc(var(--fs,0.5) * 4px) calc(var(--fs,0.5) * 13px)",
        background: `linear-gradient(148deg,#1c1208,#120e06,#1c1208)`,
        border: `1px solid rgba(200,160,48,.32)`,
        borderRadius: "3px",
        boxShadow: `0 3px 14px rgba(0,0,0,.70), inset 0 1px 0 rgba(220,180,60,.18)`,
        whiteSpace: "nowrap",
        maxWidth: "min(250px,95%)",
        overflow: "hidden",
      }}>
        <p style={{
          color: "rgba(240,210,130,.92)",
          fontWeight: 700,
          fontSize: "calc(var(--fs,0.5) * 13px)",
          letterSpacing: "1.4px",
          fontFamily: "Georgia,serif",
          margin: 0,
          textOverflow: "ellipsis",
          overflow: "hidden",
          textTransform: "uppercase",
        }}>{art.title}</p>
        <p style={{
          color: "rgba(200,160,80,.54)",
          fontSize: "calc(var(--fs,0.5) * 11px)",
          fontStyle: "italic",
          fontFamily: "Georgia,serif",
          margin: "2px 0 0",
        }}>{art.artist?.name || "Unknown Artist"}</p>
        {art.isAuction && !art.isSold && (
          <p style={{
            color: "rgba(60,210,100,.80)",
            fontSize: "calc(var(--fs,0.5) * 10px)",
            fontWeight: 700, letterSpacing: "1.2px",
            margin: "2px 0 0",
          }}>● LIVE AUCTION</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function HallwayGallery({ artworks = [] }) {
  const navigate = useNavigate();

  const canvasRef  = useRef(null);
  const frameRefs  = useRef([]);
  const sconceRefs = useRef([]);   // row*2=left, row*2+1=right
  const chandRefs  = useRef([]);
  const endArchRef = useRef(null);
  const rafRef     = useRef(null);

  const camZ   = useRef(0);
  const tgtZ   = useRef(0);
  const vel    = useRef(0);
  const sway   = useRef(0);
  const bob    = useRef(0);
  const panX   = useRef(0);
  const panTgt = useRef(0);
  const isDrag = useRef(false);
  const dragX0 = useRef(0);

  useEffect(() => { injectStyles(); }, []);

  // ── Frame rows — both walls, non-linear spacing ───────────────
  const { rows, endZ } = useMemo(() => {
    const pool  = artworks.slice(0, 16);
    const count = Math.max(Math.ceil(pool.length / 2), 1);
    const rows  = Array.from({ length: count }, (_, r) => ({
      worldZ: Math.round(Math.pow(r + 1, 1.22) * SPACING + r * 55),
      left:   pool[r * 2]     ?? null,
      right:  pool[r * 2 + 1] ?? pool[r * 2] ?? null,
      seed:   r,
    }));
    return { rows, endZ: (rows[rows.length - 1]?.worldZ ?? SPACING) + SPACING * 0.8 };
  }, [artworks]);

  const maxCamZ = endZ;

  // ── Perspective projection (unchanged) ───────────────────────
  const project = useCallback((wX, wY, wZ) => {
    const relZ = wZ - camZ.current;
    if (relZ < NEAR || relZ > FAR) return null;
    const s   = FL / relZ;
    const vw  = canvasRef.current?.offsetWidth  ?? 900;
    const vh  = canvasRef.current?.offsetHeight ?? 580;
    const cx  = vw * 0.5;
    const cy  = vh * VANISH_Y;
    const pi  = FL / (relZ + FL);
    const sx  = cx + wX * s + (panX.current + sway.current) * pi;
    const sy  = cy + wY * s + bob.current;
    const d01 = Math.min(relZ / FAR, 1);
    return { sx, sy, s, d01 };
  }, []);

  // ── RAF LOOP ─────────────────────────────────────────────────
  const tick = useCallback(() => {
    const t = performance.now() / 1000;

    vel.current += (tgtZ.current - camZ.current) * VEL_ACCEL;
    vel.current *= VEL_DAMP;
    camZ.current += vel.current;
    const spd = Math.abs(vel.current);
    sway.current = spd > 0.25 ? Math.sin(t * 0.68) * SWAY_MAX * Math.min(spd / 5.5, 1) : sway.current * 0.91;
    bob.current  = spd > 0.25 ? Math.sin(t * 1.38) * BOB_MAX  * Math.min(spd / 5.5, 1) : bob.current  * 0.91;
    panX.current += (panTgt.current - panX.current) * 0.07;

    rows.forEach((row, r) => {

      // FRAMES — left + right wall simultaneously
      [
        { art: row.left,  wX: -WALL_X, fi: r * 2,     rotY: +10 },
        { art: row.right, wX: +WALL_X, fi: r * 2 + 1, rotY: -10 },
      ].forEach(({ art, wX, fi, rotY }) => {
        const el = frameRefs.current[fi];
        if (!el || !art) return;
        const p = project(wX, 0, row.worldZ);
        if (!p) { el.style.display = "none"; return; }
        const fog  = Math.pow(p.d01, 1.32);
        const bri  = 1 - fog * 0.55;
        const blr  = fog * 2.2;
        const sat  = 1 - fog * 0.28;
        const opac = Math.max(0.04, 1 - fog * 0.65);
        el.style.display   = "block";
        el.style.left      = `${p.sx}px`;
        el.style.top       = `${p.sy}px`;
        el.style.width     = `${268 * p.s}px`;
        el.style.height    = `${212 * p.s}px`;
        el.style.transform = `translate(-50%,-50%) rotateY(${rotY}deg)`;
        el.style.opacity   = opac.toFixed(3);
        el.style.filter    = `brightness(${bri.toFixed(3)}) blur(${blr.toFixed(2)}px) saturate(${sat.toFixed(3)})`;
        el.style.zIndex    = Math.round((1 - p.d01) * 100);
        el.style.setProperty("--fs", p.s.toFixed(3));
      });

      // SCONCES — on wall surface, above eye level (wY = -60)
      // Placed exactly AT wall (wX = ±WALL_X + small inset) so they
      // appear to protrude from the wall surface realistically
      [
        { el: sconceRefs.current[r * 2],     wX: -(WALL_X - 5) },
        { el: sconceRefs.current[r * 2 + 1], wX:  (WALL_X - 5) },
      ].forEach(({ el, wX }) => {
        if (!el) return;
        const sZ = row.worldZ - SPACING * 0.46;
        const p  = project(wX, -60, sZ);
        if (!p) { el.style.opacity = "0"; return; }
        const fog  = Math.pow(p.d01, 1.32);
        el.style.opacity   = Math.max(0, 1 - fog * 0.72).toFixed(3);
        el.style.left      = `${p.sx}px`;
        el.style.top       = `${p.sy}px`;
        el.style.transform = `translate(-50%,-50%) scale(${Math.min(p.s * 1.10, 1.20).toFixed(3)})`;
        el.style.zIndex    = Math.round((1 - p.d01) * 100) + 1;
      });

      // CHANDELIERS — center axis, very high up (wY = -210)
      // With VANISH_Y=0.30, -210 projects near the ceiling band
      const cel = chandRefs.current[r];
      if (cel) {
        const cZ = row.worldZ - SPACING * 0.22;
        const p  = project(0, -210, cZ);
        if (!p) { cel.style.opacity = "0"; }
        else {
          const fog  = Math.pow(p.d01, 1.32);
          cel.style.opacity   = Math.max(0, 1 - fog * 0.65).toFixed(3);
          cel.style.left      = `${p.sx}px`;
          cel.style.top       = `${p.sy}px`;
          cel.style.transform = `translate(-50%,-50%) scale(${Math.min(p.s * 1.05, 1.12).toFixed(3)})`;
          cel.style.zIndex    = Math.round((1 - p.d01) * 100) - 1;
        }
      }
    });

    // END ARCH
    const ea = endArchRef.current;
    if (ea) {
      const p = project(0, 0, endZ + 320);
      if (!p) { ea.style.opacity = "0"; }
      else {
        const fog = Math.pow(p.d01, 1.15);
        ea.style.opacity   = Math.max(0, 1 - fog * 0.22).toFixed(3);
        ea.style.left      = `${p.sx}px`;
        ea.style.top       = `${p.sy}px`;
        ea.style.transform = `translate(-50%,-50%) scale(${Math.min(p.s * 0.82, 0.60).toFixed(3)})`;
        ea.style.zIndex    = 2;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [rows, endZ, project]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // ── Input handlers (unchanged logic) ─────────────────────────
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const h = e => { e.preventDefault(); tgtZ.current = Math.max(0, Math.min(maxCamZ, tgtZ.current + e.deltaY * CAM_SPD)); };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [maxCamZ]);

  useEffect(() => {
    const h = e => {
      const step = 360;
      if (e.key === "ArrowDown"  || e.key === "ArrowRight") tgtZ.current = Math.min(maxCamZ, tgtZ.current + step);
      if (e.key === "ArrowUp"    || e.key === "ArrowLeft")  tgtZ.current = Math.max(0, tgtZ.current - step);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [maxCamZ]);

  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const dn = e => { isDrag.current = true;  dragX0.current = e.clientX; };
    const mv = e => { if (!isDrag.current) return; panTgt.current = Math.max(-150, Math.min(150, (e.clientX - dragX0.current) * 0.30)); };
    const up = () => { isDrag.current = false; panTgt.current = 0; };
    el.addEventListener("mousedown", dn);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { el.removeEventListener("mousedown", dn); window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  const handleClick    = useCallback((art, e) => { e.stopPropagation(); navigate(`/art/${art._id}`); }, [navigate]);
  const handleDblClick = useCallback((r, e) => {
    e.stopPropagation();
    tgtZ.current = Math.min(maxCamZ, Math.round(Math.pow(r + 1, 1.22) * SPACING + r * 55) - 200);
  }, [maxCamZ]);

  // SVG VP coords (900×580 viewBox, VANISH_Y=0.30 → VPY≈174)
  const VPX = 450;
  const VPY = Math.round(580 * VANISH_Y);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        ref={canvasRef}
        style={{
          width: "100%", height: "580px",
          position: "relative", overflow: "hidden",
          cursor: "grab", userSelect: "none",
          background: C.bg,
        }}
      >

        {/* ══ BAROQUE ARCHITECTURAL SVG ═══════════════════════════
            Four triangle planes → VP giving real height + depth.
            Deep crimson walls, amber marble floor, dark ceiling.
            All trim lines are antique gold converging to VP.
        ═════════════════════════════════════════════════════════*/}
        <svg
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            pointerEvents: "none", zIndex: 1,
          }}
          viewBox="0 0 900 580"
          preserveAspectRatio="none"
        >
          <defs>
            {/* LEFT WALL — near-black edge → wine red → crimson near VP */}
            <linearGradient id="hwgBQ-lw" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={C.wallNear} />
              <stop offset="20%"  stopColor="#481018" />
              <stop offset="55%"  stopColor={C.wallMid} />
              <stop offset="85%"  stopColor={C.wallFar} />
              <stop offset="100%" stopColor={C.wallFar} stopOpacity="0" />
            </linearGradient>
            {/* RIGHT WALL — mirrored */}
            <linearGradient id="hwgBQ-rw" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%"   stopColor={C.wallNear} />
              <stop offset="20%"  stopColor="#481018" />
              <stop offset="55%"  stopColor={C.wallMid} />
              <stop offset="85%"  stopColor={C.wallFar} />
              <stop offset="100%" stopColor={C.wallFar} stopOpacity="0" />
            </linearGradient>
            {/* FLOOR — dark timber/marble near viewer, warm amber far */}
            <linearGradient id="hwgBQ-fl" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor={C.floorNear} />
              <stop offset="30%"  stopColor={C.floorMid} />
              <stop offset="68%"  stopColor={C.floorFar} />
              <stop offset="100%" stopColor="#b07840" stopOpacity="0.55" />
            </linearGradient>
            {/* CEILING — near-black near viewer, deep crimson far */}
            <linearGradient id="hwgBQ-cl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={C.ceilNear} />
              <stop offset="42%"  stopColor={C.ceilMid} />
              <stop offset="100%" stopColor={C.ceilFar} stopOpacity="0.60" />
            </linearGradient>
            {/* VP warm amber glow — localized light from far end */}
            <radialGradient id="hwgBQ-vpg" cx="50%" cy={`${VANISH_Y*100}%`} r="20%">
              <stop offset="0%"   stopColor="#ffe090" stopOpacity="0.38" />
              <stop offset="45%"  stopColor={C.amberDeep} stopOpacity="0.14" />
              <stop offset="100%" stopColor={C.amberDeep} stopOpacity="0" />
            </radialGradient>
            {/* Slight warm haze in middle distance */}
            <radialGradient id="hwgBQ-haze" cx="50%" cy="50%" r="48%">
              <stop offset="0%"   stopColor="rgba(255,160,40,0)" />
              <stop offset="70%"  stopColor="rgba(255,140,30,.04)" />
              <stop offset="100%" stopColor="rgba(200,100,20,.08)" />
            </radialGradient>
          </defs>

          {/* ── FOUR PLANES — the architectural space ── */}
          <polygon points={`0,0 0,580 ${VPX},${VPY}`}     fill="url(#hwgBQ-lw)" />
          <polygon points={`900,0 900,580 ${VPX},${VPY}`} fill="url(#hwgBQ-rw)" />
          <polygon points={`0,580 900,580 ${VPX},${VPY}`} fill="url(#hwgBQ-fl)" />
          <polygon points={`0,0 900,0 ${VPX},${VPY}`}     fill="url(#hwgBQ-cl)" />

          {/* Warm end-of-hall amber light */}
          <rect x="0" y="0" width="900" height="580" fill="url(#hwgBQ-vpg)" />
          <rect x="0" y="0" width="900" height="580" fill="url(#hwgBQ-haze)" />

          {/* ── POLISHED FLOOR TILES (marble bands) ── */}
          {[0.10, 0.24, 0.40, 0.56, 0.70, 0.83, 0.93].map((t, i) => {
            const y  = VPY + (580 - VPY) * t;
            const lx = VPX * t;
            return <line key={`ft${i}`} x1={lx} y1={y} x2={900 - lx} y2={y}
              stroke={C.gold} strokeWidth="0.55" opacity="0.28" />;
          })}
          {/* floor mirror reflection strip */}
          <line x1={VPX} y1={580} x2={VPX} y2={VPY}
            stroke="rgba(255,180,60,.08)" strokeWidth="4" />

          {/* ── BARREL VAULT CEILING COFFERS (rectangular grid) ──
              Cross-hatch of horizontal bands + radial lines = coffered vault
          ── */}
          {[0.08, 0.18, 0.30, 0.44, 0.60, 0.76, 0.90].map((t, i) => {
            const y  = VPY * t;
            const lx = VPX * t;
            return <line key={`cr${i}`} x1={lx} y1={y} x2={900 - lx} y2={y}
              stroke={C.goldShadow} strokeWidth="0.55" opacity="0.30" />;
          })}
          {/* vault ribs — diagonal from corners to VP */}
          {[0.15, 0.35, 0.65, 0.85].map((t, i) => (
            <line key={`vr${i}`}
              x1={900 * t} y1={0} x2={VPX} y2={VPY}
              stroke={C.goldShadow} strokeWidth="0.45" opacity="0.22" />
          ))}

          {/* ── ANTIQUE GOLD ARCHITECTURAL TRIM ── */}
          {/* Crown molding — ceiling/wall junction */}
          <line x1={0}   y1={0}   x2={VPX} y2={VPY} stroke={C.goldHi} strokeWidth="1.2" opacity="0.45" />
          <line x1={900} y1={0}   x2={VPX} y2={VPY} stroke={C.goldHi} strokeWidth="1.2" opacity="0.45" />
          {/* cornice shadow below crown */}
          <line x1={0}   y1={6}   x2={VPX} y2={VPY} stroke={C.goldDark} strokeWidth="0.5" opacity="0.25" />
          <line x1={900} y1={6}   x2={VPX} y2={VPY} stroke={C.goldDark} strokeWidth="0.5" opacity="0.25" />
          {/* picture rail */}
          <line x1={0}   y1={148} x2={VPX} y2={VPY} stroke={C.gold} strokeWidth="0.80" opacity="0.32" />
          <line x1={900} y1={148} x2={VPX} y2={VPY} stroke={C.gold} strokeWidth="0.80" opacity="0.32" />
          {/* dado rail */}
          <line x1={0}   y1={362} x2={VPX} y2={VPY} stroke={C.gold} strokeWidth="0.90" opacity="0.30" />
          <line x1={900} y1={362} x2={VPX} y2={VPY} stroke={C.gold} strokeWidth="0.90" opacity="0.30" />
          {/* baseboard top */}
          <line x1={0}   y1={508} x2={VPX} y2={VPY} stroke={C.gold} strokeWidth="0.65" opacity="0.24" />
          <line x1={900} y1={508} x2={VPX} y2={VPY} stroke={C.gold} strokeWidth="0.65" opacity="0.24" />
          {/* floor/wall base */}
          <line x1={0}   y1={580} x2={VPX} y2={VPY} stroke={C.goldHi} strokeWidth="1.1" opacity="0.36" />
          <line x1={900} y1={580} x2={VPX} y2={VPY} stroke={C.goldHi} strokeWidth="1.1" opacity="0.36" />

          {/* ── WALL PANEL BAY DIVIDERS — strict symmetry ── */}
          {[78, 168, 278, 388, 495].map((wy, i) => (
            <g key={`pd${i}`} opacity="0.20">
              <line x1={0}   y1={wy} x2={VPX} y2={VPY} stroke={C.gold} strokeWidth="0.55" />
              <line x1={900} y1={wy} x2={VPX} y2={VPY} stroke={C.gold} strokeWidth="0.55" />
            </g>
          ))}
        </svg>

        {/* ══ CEILING VAULTING DARKNESS ═══════════════════════════*/}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "29%",
          pointerEvents: "none", zIndex: 4,
          background: `linear-gradient(180deg,${C.ceilNear} 0%,rgba(24,8,12,.55) 62%,transparent 100%)`,
        }} />

        {/* ══ FLOOR DEPTH ══════════════════════════════════════════*/}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "30%",
          pointerEvents: "none", zIndex: 4,
          background: `linear-gradient(180deg,transparent 0%,rgba(20,10,4,.42) 58%,rgba(8,4,2,.86) 100%)`,
        }}>
          {/* polished floor reflection line */}
          <div style={{
            position: "absolute", top: "5%", left: "34%", right: "34%", height: "1px",
            background: "linear-gradient(90deg,transparent,rgba(255,180,60,.16),transparent)",
          }} />
        </div>

        {/* ══ VANISHING POINT WARM AMBER GLOW ════════════════════*/}
        <div style={{
          position: "absolute",
          top: `${VANISH_Y * 100}%`, left: "50%",
          transform: "translate(-50%,-50%)",
          width: "340px", height: "210px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(255,200,80,.18) 0%,rgba(230,160,40,.06) 50%,transparent 72%)",
          pointerEvents: "none", zIndex: 3,
          animation: "hwg-vpglow 4.5s ease-in-out infinite",
        }} />

        {/* ══ FOREGROUND COLUMNS — polished dark wood, gold caps ══*/}
        {["left", "right"].map(side => (
          <div key={side} style={{
            position: "absolute", top: "5%", [side]: "7%",
            width: "20px", height: "90%",
            background: `linear-gradient(90deg,${C.col},${C.colHi},${C.col},${C.colHi},${C.col})`,
            borderLeft:  side === "right" ? `1px solid rgba(200,160,48,.34)` : undefined,
            borderRight: side === "left"  ? `1px solid rgba(200,160,48,.34)` : undefined,
            pointerEvents: "none", zIndex: 12,
            boxShadow: side === "left" ? "2px 0 10px rgba(0,0,0,.50)" : "-2px 0 10px rgba(0,0,0,.50)",
          }}>
            {/* capital */}
            <div style={{
              position: "absolute", top: 0, left: "-8px", right: "-8px", height: "17px",
              background: `linear-gradient(180deg,${C.goldHi},${C.gold},${C.goldDark})`,
              borderRadius: "3px 3px 0 0",
              boxShadow: "0 2px 7px rgba(0,0,0,.55)",
            }} />
            {/* shaft highlight */}
            <div style={{
              position: "absolute", top: "17px", bottom: "13px",
              left: "38%", width: "2px",
              background: "linear-gradient(180deg,rgba(200,160,48,.22),transparent)",
            }} />
            {/* base */}
            <div style={{
              position: "absolute", bottom: 0, left: "-8px", right: "-8px", height: "13px",
              background: `linear-gradient(0deg,${C.goldHi},${C.gold},${C.goldDark})`,
              boxShadow: "0 -2px 7px rgba(0,0,0,.45)",
            }} />
          </div>
        ))}

        {/* ══ EDGE VIGNETTES — near-black ════════════════════════*/}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: "11%",
          background: "linear-gradient(90deg,rgba(4,0,0,.94) 0%,transparent 100%)",
          pointerEvents: "none", zIndex: 13,
        }} />
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: "11%",
          background: "linear-gradient(270deg,rgba(4,0,0,.94) 0%,transparent 100%)",
          pointerEvents: "none", zIndex: 13,
        }} />

        {/* ══ ATMOSPHERIC DEPTH — warm amber air, not fog ═════════*/}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse 82% 65% at 50% ${VANISH_Y * 100}%,
            transparent 25%,
            rgba(200,100,20,.06) 62%,
            rgba(100,40,10,.22) 100%)`,
          pointerEvents: "none", zIndex: 11,
        }} />

        {/* ══ END ARCH ALCOVE — rounded barrel arch, crimson ══════*/}
        <div
          ref={endArchRef}
          style={{
            position: "absolute",
            pointerEvents: "none", zIndex: 8, opacity: 0,
            textAlign: "center",
          }}
        >
          <div style={{
            width: "155px", height: "205px",
            borderRadius: "78px 78px 0 0",
            border: `2px solid rgba(200,160,48,.55)`,
            background: `linear-gradient(180deg,rgba(50,12,18,.88),rgba(18,4,8,.97))`,
            boxShadow: `
              0 0 36px rgba(200,140,40,.24),
              inset 0 0 28px rgba(0,0,0,.80)
            `,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "hwg-archglow 3.8s ease-in-out infinite",
            margin: "0 auto",
          }}>
            <p style={{
              color: "rgba(200,160,60,.72)",
              fontSize: "9px", letterSpacing: "3.5px",
              textTransform: "uppercase",
              fontFamily: "Georgia,serif",
              lineHeight: 2.2,
            }}>Grand<br/>Gallery</p>
          </div>
          <div style={{
            width: "100px", height: "9px", margin: "0 auto",
            background: "radial-gradient(ellipse,rgba(0,0,0,.45) 0%,transparent 78%)",
          }} />
        </div>

        {/* ══ FRAME SLOTS ══════════════════════════════════════════*/}
        {rows.flatMap((row, r) => [
          row.left && (
            <div key={`fl-${r}`}
              ref={el => { frameRefs.current[r * 2] = el; }}
              onClick={e => handleClick(row.left, e)}
              onDoubleClick={e => handleDblClick(r, e)}
              style={{ display: "none", position: "absolute", willChange: "transform,opacity,filter" }}
            ><FrameContent art={row.left} idx={r * 2} /></div>
          ),
          row.right && (
            <div key={`fr-${r}`}
              ref={el => { frameRefs.current[r * 2 + 1] = el; }}
              onClick={e => handleClick(row.right, e)}
              onDoubleClick={e => handleDblClick(r, e)}
              style={{ display: "none", position: "absolute", willChange: "transform,opacity,filter" }}
            ><FrameContent art={row.right} idx={r * 2 + 1} /></div>
          ),
        ])}

        {/* ══ SCONCE SLOTS — wall-mounted candle brackets ═════════*/}
        {rows.flatMap((row, r) => [
          <div key={`sl-${r}`}
            ref={el => { sconceRefs.current[r * 2] = el; }}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", zIndex: 9 }}
          ><WallSconce seed={row.seed} /></div>,
          <div key={`sr-${r}`}
            ref={el => { sconceRefs.current[r * 2 + 1] = el; }}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", zIndex: 9 }}
          ><WallSconce seed={row.seed + 37} /></div>,
        ])}

        {/* ══ CHANDELIER SLOTS — ceiling center axis ══════════════*/}
        {rows.map((row, r) => (
          <div key={`ch-${r}`}
            ref={el => { chandRefs.current[r] = el; }}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", zIndex: 7 }}
          ><Chandelier seed={row.seed} /></div>
        ))}

        {/* ══ SCROLL HINT ══════════════════════════════════════════*/}
        <div style={{
          position: "absolute", bottom: "14px", left: "50%",
          transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
          pointerEvents: "none", zIndex: 20,
        }}>
          <p style={{
            color: "rgba(200,150,50,.52)",
            fontSize: "9.5px", fontWeight: 700,
            letterSpacing: "2.5px", textTransform: "uppercase",
            fontFamily: "Georgia,serif",
          }}>Scroll · Arrow Keys · Drag</p>
          <div style={{
            width: "16px", height: "25px",
            border: "1px solid rgba(200,150,50,.40)",
            borderRadius: "8px", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: "5px", left: "50%",
              width: "3px", height: "5px", borderRadius: "2px",
              background: "rgba(200,150,50,.68)",
              animation: "hwg-bob 1.8s ease-in-out infinite",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
} 