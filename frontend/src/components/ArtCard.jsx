import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../api/axiosConfig";
import toast from "react-hot-toast";
import StatusBadge from "./StatusBadge";
import CountdownTimer from "./CountdownTimer";
import { useMagneticEffect } from "../hooks/useMagneticEffect";

const ArtCard = ({ art, onAdmireToggle }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // ── Magnetic wrapper — outer div handles transform, inner card untouched ──
  const magneticRef = useMagneticEffect({
    strength: 0.2,
    radius: 190,
    maxTrans: 4,
    maxRotate: 2,
  });

  const handleAdmire = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to admire artworks");
      navigate("/login");
      return;
    }
    try {
      await API.put(`/artworks/${art._id}/admire`);
      if (onAdmireToggle) onAdmireToggle(art._id);
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleClick = () => {
    const auctionIsActive = art.isAuction &&
      !art.isSold &&
      art.status === "approved" &&
      (!art.auctionEndTime || new Date() < new Date(art.auctionEndTime));

    if (auctionIsActive) {
      navigate(`/auction/${art._id}`);
    } else {
      navigate(`/art/${art._id}`);
    }
  };

  const isAdmired = user && art.admirers?.includes(user._id);
  const displayImage = art.imageUrl || art.image || "https://via.placeholder.com/400x300?text=No+Image";

  const auctionIsActive = art.isAuction &&
    !art.isSold &&
    art.status === "approved" &&
    (!art.auctionEndTime || new Date() < new Date(art.auctionEndTime));

  return (
    // Outer: magnetic transform wrapper — willChange:transform, no layout impact
    <div
      ref={magneticRef}
      style={{ willChange: "transform", transformStyle: "preserve-3d" }}
    >
      {/* Inner: original card, all classes/logic unchanged */}
      <div
        onClick={handleClick}
        className="bg-[#1e1e38] rounded-xl overflow-hidden border border-gray-800 cursor-pointer hover:border-[#6c3483] hover:scale-[1.02] transition-all duration-300 shadow-lg group fade-up"
      >
        <div className="relative">
          <img
            src={displayImage}
            alt={art.title}
            className="w-full h-52 object-cover group-hover:brightness-110 transition-all duration-300"
          />

          {art.isSold && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-red-500 font-black text-3xl border-4 border-red-500 px-4 py-1 rotate-[-15deg]">
                SOLD
              </span>
            </div>
          )}

          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
            {auctionIsActive && <StatusBadge status="auction" />}
            {art.exhibitionType === "view-only" && <StatusBadge status="view-only" />}
            {art.exhibitionType === "hybrid" && <StatusBadge status="hybrid" />}
          </div>

          <button
            onClick={handleAdmire}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 rounded-full p-2 transition"
          >
            <span className={`text-lg ${isAdmired ? "text-red-500" : "text-white"}`}>
              {isAdmired ? "♥" : "♡"}
            </span>
          </button>
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-bold text-white truncate text-lg">{art.title}</h3>
          <p className="text-gray-400 text-sm truncate">
            {art.artist?.name || "Unknown Artist"}
          </p>

          <div className="flex items-center justify-between pt-1">
            {art.isSold ? (
              <span className="text-red-400 font-bold text-sm">
                Sold {art.soldWhere ? `(${art.soldWhere})` : ""} — ${art.soldPrice}
              </span>
            ) : auctionIsActive ? (
              <div className="flex flex-col gap-1 w-full">
                <span className="text-green-400 font-bold text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                  Live Auction — Click to Enter
                </span>
                <span className="text-[#6c3483] text-xs font-bold">
                  Starting: ${art.auctionStartPrice || 0}
                </span>
                {art.auctionEndTime && <CountdownTimer endTime={art.auctionEndTime} />}
              </div>
            ) : (
              <span className="text-white font-bold">${art.price}</span>
            )}

            {!auctionIsActive && !art.isSold && (
              <span className="text-gray-500 text-xs">♥ {art.admirers?.length || 0}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtCard;