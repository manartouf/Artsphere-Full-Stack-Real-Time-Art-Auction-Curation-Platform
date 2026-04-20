import { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axiosConfig";
import { AuthContext } from "../context/AuthContext";
import GalleryWallCard from "../components/GalleryWallCard";
import LoadingSpinner from "../components/LoadingSpinner";
import CountdownTimer from "../components/CountdownTimer";
import toast from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AuctionRoom = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [currentArtIndex, setCurrentArtIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentBid, setCurrentBid] = useState(0);
  const [startingPrice, setStartingPrice] = useState(0);
  const [totalBids, setTotalBids] = useState(0);
  const [nextBidAmount, setNextBidAmount] = useState(0);
  const [highestBidder, setHighestBidder] = useState(null);
  const [bidHistory, setBidHistory] = useState([]);
  const [bidding, setBidding] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [soldCountdown, setSoldCountdown] = useState(null);
  const [artworkJustSold, setArtworkJustSold] = useState(false);

  const currentArtIndexRef = useRef(0);
  const artworksRef = useRef([]);
  const currentBidRef = useRef(0);
  const highestBidderRef = useRef(null);
  const startingPriceRef = useRef(0);
  const totalBidsRef = useRef(0);
  const auctionEndedRef = useRef(false);
  const artworkJustSoldRef = useRef(false);
  const userRef = useRef(user);
  const countdownTimers = useRef([]);
  const bidHistoryScrollRef = useRef(null);
  // Prevents double mark-sold calls for the same artwork across clients
  const markSoldCalledRef = useRef(new Set());

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { currentArtIndexRef.current = currentArtIndex; }, [currentArtIndex]);
  useEffect(() => { artworksRef.current = artworks; }, [artworks]);
  useEffect(() => { currentBidRef.current = currentBid; }, [currentBid]);
  useEffect(() => { highestBidderRef.current = highestBidder; }, [highestBidder]);
  useEffect(() => { startingPriceRef.current = startingPrice; }, [startingPrice]);
  useEffect(() => { totalBidsRef.current = totalBids; }, [totalBids]);
  useEffect(() => { auctionEndedRef.current = auctionEnded; }, [auctionEnded]);
  useEffect(() => { artworkJustSoldRef.current = artworkJustSold; }, [artworkJustSold]);

  const currentArt = artworks[currentArtIndex];

  const computeNextBid = (sp, bidsCount) => {
    const increment = Math.ceil(sp * 0.1) || 1;
    return sp + increment * (bidsCount + 1);
  };

  const clearCountdownTimers = () => {
    countdownTimers.current.forEach(t => clearTimeout(t));
    countdownTimers.current = [];
  };

  // ── handleArtworkSold ─────────────────────────────────
  // KEY FIX: Does NOT use setArtworks(prev => ...) callback form.
  // Instead reads from artworksRef.current directly so all ref updates
  // are synchronous and the socket bidUpdate handler always sees fresh state.
  const handleArtworkSoldRef = useRef(null);
  handleArtworkSoldRef.current = async () => {
    const idx = currentArtIndexRef.current;
    const winningBid = currentBidRef.current;
    const winner = highestBidderRef.current;
    const currentUser = userRef.current;
    const artId = artworksRef.current[idx]?._id;

    // Prevent double-fire for same artwork (e.g. two clients both reach SOLD)
    if (!artId || markSoldCalledRef.current.has(String(artId))) return;
    markSoldCalledRef.current.add(String(artId));

    // Notify winner immediately
    if (winner && String(currentUser?._id) === String(winner._id)) {
      toast.success(
        `🎉 You won "${artworksRef.current[idx]?.title}" for $${winningBid}!`,
        { duration: 6000 }
      );
    }

    // Call backend to mark sold, deduct wallet, notify winner in DB
    if (artId) {
      try {
        await API.put(`/artworks/${artId}/mark-sold`);
      } catch {
        // Already sold is fine — idempotent
      }
    }

    setArtworkJustSold(true);
    artworkJustSoldRef.current = true;

    setTimeout(() => {
      setArtworkJustSold(false);
      artworkJustSoldRef.current = false;
      setSoldCountdown(null);

      // ── CRITICAL FIX ──────────────────────────────────
      // Build freshArts from ref (not from stale prev callback).
      // Then immediately sync ref AND state together so socket
      // handlers always read the correct current artwork.
      const freshArts = artworksRef.current.map((a, i) =>
        i === idx ? { ...a, isSold: true, soldPrice: winningBid } : a
      );
      artworksRef.current = freshArts;   // sync ref first
      setArtworks(freshArts);            // then state
      // ──────────────────────────────────────────────────

      const nextIdx = freshArts.findIndex((a, i) => i > idx && !a.isSold);

      if (nextIdx !== -1) {
        const nextArt = freshArts[nextIdx];
        const sp = nextArt.auctionStartPrice || nextArt.price || 0;

        // Update index ref synchronously before state so socket handler
        // immediately uses correct artwork for artId filtering
        currentArtIndexRef.current = nextIdx;
        setCurrentArtIndex(nextIdx);

        startingPriceRef.current = sp;
        setStartingPrice(sp);

        currentBidRef.current = sp;
        setCurrentBid(sp);

        totalBidsRef.current = 0;
        setTotalBids(0);

        highestBidderRef.current = null;
        setHighestBidder(null);

        setBidHistory([]);
        clearCountdownTimers();
        setNextBidAmount(computeNextBid(sp, 0));

        toast(`🎨 Next: "${nextArt.title}" — Bidding starts now!`, { duration: 4000 });
      } else {
        // All artworks done
        auctionEndedRef.current = true;
        setAuctionEnded(true);
        clearCountdownTimers();
        toast("🏁 All artworks sold! Auction complete.", { icon: "🎉", duration: 5000 });
      }
    }, 3000);
  };

  // ── startSoldCountdown ────────────────────────────────
  const startSoldCountdownRef = useRef(null);
  startSoldCountdownRef.current = () => {
    clearCountdownTimers();
    setSoldCountdown(null);
    const steps = [
      { label: "once",   ms: 2000  },
      { label: "twice",  ms: 4000  },
      { label: "thrice", ms: 6000  },
      { label: "fourth", ms: 8000  },
      { label: "fifth",  ms: 10000 },
    ];
    steps.forEach(({ label, ms }) => {
      const t = setTimeout(() => setSoldCountdown(label), ms);
      countdownTimers.current.push(t);
    });
    const soldTimer = setTimeout(() => {
      setSoldCountdown("sold");
      handleArtworkSoldRef.current();
    }, 12000);
    countdownTimers.current.push(soldTimer);
  };

  // ── Socket — set up ONCE, all callbacks read from refs ─
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      forceNew: true,
    });

    socket.on("connect", () => {
      socket.emit("joinAuction", id);
    });

    socket.on("bidUpdate", (data) => {
      if (auctionEndedRef.current) return;

      // artworksRef.current and currentArtIndexRef.current are always fresh
      // because we update them synchronously in handleArtworkSoldRef above
      const currentArtNow = artworksRef.current[currentArtIndexRef.current];
      if (data.artId && currentArtNow && String(data.artId) !== String(currentArtNow._id)) return;

      setCurrentBid(data.currentBid);
      currentBidRef.current = data.currentBid;

      setTotalBids(data.totalBids || 0);
      totalBidsRef.current = data.totalBids || 0;

      if (data.highestBidder) {
        setHighestBidder(data.highestBidder);
        highestBidderRef.current = data.highestBidder;
      }

      if (data.bids) setBidHistory(data.bids);

      if (data.nextExpectedBid) {
        setNextBidAmount(data.nextExpectedBid);
      }

      if (data.startingPrice) {
        setStartingPrice(data.startingPrice);
        startingPriceRef.current = data.startingPrice;
      }

      if (bidHistoryScrollRef.current) bidHistoryScrollRef.current.scrollTop = 0;

      setSoldCountdown(null);
      startSoldCountdownRef.current();
    });

    socket.on("bidToast", (data) => {
      const currentArtNow = artworksRef.current[currentArtIndexRef.current];
      if (data.artId && currentArtNow && String(data.artId) !== String(currentArtNow._id)) return;
      if (String(data.bidderId) === String(userRef.current?._id)) return;

      toast(`🔨 ${data.bidderName} bid $${data.amount}! Next bid: $${data.nextBid}`, {
        duration: 3500,
        style: { background: "#1e1e38", color: "#fff", border: "1px solid #6c3483" },
      });
    });

    socket.on("auctionEnded", () => {
      setAuctionEnded(true);
      auctionEndedRef.current = true;
      setSoldCountdown(null);
      clearCountdownTimers();
      toast("🏁 Auction has ended!", { icon: "🎨", duration: 5000 });
    });

    return () => {
      socket.disconnect();
      clearCountdownTimers();
    };
  }, [id]);

  // ── Fetch auction — correct routes, no change ─────────
  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const { data: auctionData } = await API.get(`/auctions/${id}`);
        setAuction(auctionData);

        if (auctionData.status === "ended") {
          setAuctionEnded(true);
          auctionEndedRef.current = true;
          if (auctionData.collectionId?.artworks?.length > 0) {
            setArtworks(auctionData.collectionId.artworks);
            artworksRef.current = auctionData.collectionId.artworks;
          }
          setLoading(false);
          return;
        }

        if (auctionData.collectionId?.artworks?.length > 0) {
          const arts = auctionData.collectionId.artworks;
          setArtworks(arts);
          artworksRef.current = arts;

          const firstUnsoldIdx = arts.findIndex(a => !a.isSold);
          if (firstUnsoldIdx === -1) {
            setAuctionEnded(true);
            auctionEndedRef.current = true;
            setLoading(false);
            return;
          }

          setCurrentArtIndex(firstUnsoldIdx);
          currentArtIndexRef.current = firstUnsoldIdx;

          const artData = await API.get(`/artworks/${arts[firstUnsoldIdx]._id}`);
          const artInfo = artData.data;

          const sp = artInfo.auctionStartPrice || artInfo.price || 0;
          const bidsCount = artInfo.bids?.length || 0;

          setStartingPrice(sp);
          startingPriceRef.current = sp;
          setCurrentBid(artInfo.currentBid || sp);
          currentBidRef.current = artInfo.currentBid || sp;
          setTotalBids(bidsCount);
          totalBidsRef.current = bidsCount;
          setBidHistory(artInfo.bids || []);
          setHighestBidder(artInfo.highestBidder || null);
          highestBidderRef.current = artInfo.highestBidder || null;
          setNextBidAmount(computeNextBid(sp, bidsCount));

          // Resume countdown if last bid was within last 12s
          if (artInfo.bids?.length > 0) {
            const lastBid = artInfo.bids[artInfo.bids.length - 1];
            const elapsed = Date.now() - new Date(lastBid.time || lastBid.createdAt).getTime();
            if (elapsed < 12000) {
              clearCountdownTimers();
              const steps = [
                { label: "once",   ms: 2000  },
                { label: "twice",  ms: 4000  },
                { label: "thrice", ms: 6000  },
                { label: "fourth", ms: 8000  },
                { label: "fifth",  ms: 10000 },
              ];
              steps.forEach(({ label, ms }) => {
                const remaining = ms - elapsed;
                if (remaining > 0) {
                  const t = setTimeout(() => setSoldCountdown(label), remaining);
                  countdownTimers.current.push(t);
                }
              });
              const soldRemaining = 12000 - elapsed;
              if (soldRemaining > 0) {
                const t = setTimeout(() => {
                  setSoldCountdown("sold");
                  handleArtworkSoldRef.current();
                }, soldRemaining);
                countdownTimers.current.push(t);
              }
            }
          }
        }
      } catch {
        toast.error("Failed to load auction");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();

    if (user?.role === "buyer") {
      API.get("/users/wallet")
        .then(({ data }) => setWalletBalance(data.walletBalance))
        .catch(() => {});
    }

    return () => clearCountdownTimers();
  }, [id]);

  // ── Place bid ─────────────────────────────────────────
  const handlePlaceBid = async () => {
    if (!currentArt || currentArt.isSold || artworkJustSold || soldCountdown === "sold") {
      toast.error("Bidding is closed for this artwork.");
      return;
    }
    if (walletBalance !== null && nextBidAmount > walletBalance) {
      toast.error(`Insufficient balance. You have $${walletBalance}`);
      return;
    }
    setBidding(true);
    try {
      await API.post(`/artworks/${currentArt._id}/bid`, { amount: nextBidAmount });
      toast.success(`Bid placed: $${nextBidAmount} 🎨`);
      if (user?.role === "buyer") {
        const { data } = await API.get("/users/wallet");
        setWalletBalance(data.walletBalance);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to place bid");
    } finally {
      setBidding(false);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const getCountdownLabel = (step) => ({
    once:   "🔔 Going once...",
    twice:  "⚡ Going twice...",
    thrice: "🔔 Going thrice...",
    fourth: "⚡ Going fourth...",
    fifth:  "🔔 Going fifth...",
    sold:   "🔨 SOLD!",
  }[step] || "");

  if (loading) return <LoadingSpinner />;
  if (!auction) return <div className="text-center text-gray-500 py-20">Auction not found.</div>;

  const isActive = auction.status === "approved" && !auctionEnded && !!currentArt && !currentArt.isSold;
  const canBid = isActive && !artworkJustSold && soldCountdown !== "sold";
  const increment = Math.ceil(startingPrice * 0.1) || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 text-white">

      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[#6c3483] text-sm font-bold uppercase tracking-widest mb-1">Live Auction</p>
            <h1 className="text-4xl font-black text-white" style={{ fontFamily: "Georgia, serif" }}>
              {auction.collectionId?.name || "Auction"}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Artwork {currentArtIndex + 1} of {artworks.length} · {artworks.filter(a => a.isSold).length} sold
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${
            isActive
              ? "bg-green-900/40 text-green-400 border-green-700"
              : "bg-gray-800 text-gray-400 border-gray-700"
          }`}>
            {isActive
              ? <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />LIVE</>
              : <>⚫ ENDED</>
            }
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 mb-10" />

      {auctionEnded && !soldCountdown && (
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-6 text-center mb-8">
          <p className="text-2xl mb-2">🏁</p>
          <p className="text-white font-bold text-lg">Auction Has Ended</p>
          <p className="text-gray-400 text-sm mt-1">
            {artworks.filter(a => a.isSold).length} of {artworks.length} artworks sold
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        <div className="xl:col-span-2">
          {artworks.length > 0 ? (
            <GalleryWallCard
              artworks={artworks}
              mode="auction"
              currentBid={currentBid}
              user={user}
              onBid={null}
              initialIndex={currentArtIndex}
            />
          ) : (
            <div className="text-center text-gray-500 py-20 bg-[#1e1e38] rounded-xl border border-gray-800">
              <p className="text-4xl mb-4">🎨</p>
              <p>No artworks in this collection.</p>
            </div>
          )}

          {artworks.some(a => a.isSold) && (
            <div className="mt-6 bg-[#1e1e38] border border-gray-800 rounded-xl p-5">
              <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4">Sold Artworks</h3>
              <div className="space-y-3">
                {artworks.filter(a => a.isSold).map(art => (
                  <div key={art._id} className="flex items-center gap-3">
                    <img
                      src={art.imageUrl || art.image}
                      alt={art.title}
                      className="w-12 h-12 object-cover rounded border border-gray-700 flex-shrink-0"
                    />
                    <div>
                      <p className="text-white font-bold text-sm">{art.title}</p>
                      <p className="text-red-400 text-xs font-bold">Sold for ${art.soldPrice}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">

          {currentArt && !currentArt.isSold && !artworkJustSold && (
            <div className="bg-[#1e1e38] border border-[#6c3483]/40 rounded-xl p-5 space-y-1">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Now Bidding</p>
              <p className="text-white font-black text-lg">{currentArt.title}</p>
              <p className="text-gray-400 text-sm">By {currentArt.artist?.name || "Unknown"}</p>
            </div>
          )}

          <div className="bg-[#1e1e38] border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Starting Price</p>
              <p className="text-white font-bold text-lg">${startingPrice}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Current Highest Bid</p>
              <p className="text-4xl font-black text-[#6c3483]">
                ${currentBid > 0 ? currentBid : startingPrice}
              </p>
            </div>
            {highestBidder && (
              <p className="text-gray-400 text-sm">
                Leading: <span className="text-white font-bold">{highestBidder?.name || "Anonymous"}</span>
              </p>
            )}
            <p className="text-gray-500 text-xs">Bids placed: {totalBids}</p>

            {user?.role === "buyer" && walletBalance !== null && (
              <div className="border-t border-gray-800 pt-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Your Wallet</p>
                <p className={`text-xl font-black mt-1 ${walletBalance < nextBidAmount ? "text-red-400" : "text-green-400"}`}>
                  ${walletBalance}
                </p>
              </div>
            )}

            {auction.startTime && !auctionEnded && (
              <div className="border-t border-gray-800 pt-4 space-y-1">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Auction Time Remaining</p>
                <CountdownTimer
                  endTime={new Date(
                    new Date(auction.startTime).getTime() +
                    (auction.durationHours || 24) * 60 * 60 * 1000
                  ).toISOString()}
                />
              </div>
            )}
          </div>

          {soldCountdown && (
            <div className={`rounded-xl p-5 text-center border transition-all duration-300 ${
              soldCountdown === "sold"
                ? "bg-red-900/40 border-red-600"
                : "bg-yellow-900/30 border-yellow-600"
            }`}>
              {soldCountdown === "sold" ? (
                <>
                  <p className="text-4xl font-black text-red-400 animate-pulse">🔨 SOLD!</p>
                  <p className="text-white font-bold text-base mt-2">{currentArt?.title}</p>
                  {highestBidder && (
                    <p className="text-gray-300 text-sm mt-2">
                      Won by{" "}
                      <span className="text-[#6c3483] font-bold">{highestBidder.name}</span>
                      {" "}for{" "}
                      <span className="text-white font-bold">${currentBid}</span>
                    </p>
                  )}
                  {highestBidder && String(user?._id) === String(highestBidder._id) && (
                    <p className="text-green-400 font-bold text-sm mt-2">🎉 You won this artwork!</p>
                  )}
                </>
              ) : (
                <p className="text-2xl font-black text-yellow-300 animate-pulse">
                  {getCountdownLabel(soldCountdown)}
                </p>
              )}
            </div>
          )}

          {canBid && user?.role === "buyer" && (
            <div className="bg-[#1e1e38] border border-[#6c3483]/50 rounded-xl p-6 space-y-4">
              <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider">Place Your Bid</h3>
              <div className="bg-[#16162a] rounded-lg p-4 text-center space-y-1 border border-[#6c3483]/20">
                <p className="text-gray-400 text-xs">Your next bid</p>
                <p className="text-3xl font-black text-[#6c3483]">${nextBidAmount}</p>
                <p className="text-gray-500 text-xs">
                  Bid #{totalBids + 1} · +${increment} per bid (10% of ${startingPrice})
                </p>
              </div>
              <button
                onClick={handlePlaceBid}
                disabled={bidding || (walletBalance !== null && nextBidAmount > walletBalance)}
                className="w-full bg-[#6c3483] py-4 rounded-lg font-black text-white text-lg hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bidding ? "Placing Bid..." : `Bid $${nextBidAmount} 🎨`}
              </button>
              {walletBalance !== null && nextBidAmount > walletBalance && (
                <p className="text-red-400 text-xs text-center">Insufficient wallet balance</p>
              )}
            </div>
          )}

          {canBid && !user && (
            <div className="bg-[#1e1e38] border border-gray-800 rounded-xl p-6 text-center space-y-3">
              <p className="text-gray-400 text-sm">Login to participate</p>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-[#6c3483] py-3 rounded-lg font-bold text-white hover:bg-opacity-90 transition"
              >
                Login to Bid
              </button>
            </div>
          )}

          {canBid && user && user.role !== "buyer" && (
            <div className="bg-[#1e1e38] border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-sm">Only buyers can place bids</p>
            </div>
          )}

          <div className="bg-[#1e1e38] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider">Bid History</h3>
              {totalBids > 0 && (
                <span className="text-xs text-[#6c3483] font-bold">
                  {totalBids} bid{totalBids !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div
              ref={bidHistoryScrollRef}
              className="space-y-3 max-h-64 overflow-y-auto pr-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#6c3483 #1a1a2e" }}
            >
              {bidHistory.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No bids yet. Be the first!</p>
              ) : (
                [...bidHistory].reverse().map((bid, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center py-2 border-b border-gray-800 ${
                      i === 0 ? "text-white" : "text-gray-400"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold">
                        {bid.bidder?.name || "Anonymous"}
                        {i === 0 && (
                          <span className="ml-2 text-xs text-[#6c3483] font-bold">WINNING</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">{timeAgo(bid.time || bid.createdAt)}</p>
                    </div>
                    <span className={`font-black ${i === 0 ? "text-[#6c3483]" : ""}`}>
                      ${bid.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 border-t border-gray-800 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-[#6c3483] text-sm transition"
        >
          ← Go back
        </button>
      </div>
    </div>
  );
};

export default AuctionRoom;