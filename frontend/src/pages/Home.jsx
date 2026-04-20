import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axiosConfig";
import { AuthContext } from "../context/AuthContext";
import ArtCard from "../components/ArtCard";
import ArtistCard from "../components/ArtistCard";
import CountdownTimer from "../components/CountdownTimer";
import LoadingSpinner from "../components/LoadingSpinner";
import { useTypingEffect } from "../hooks/useTypingEffect";
//import InfiniteCanvas from "../components/InfiniteCanvas";

// Words that cycle in the animated hero heading
const HERO_WORDS = ["Discover", "Collect", "Explore", "Experience"];

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [artworks, setArtworks] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // ── Typing effect for hero heading ──────────────────────
  const typedWord = useTypingEffect(HERO_WORDS, {
    typeSpeed: 80,
    deleteSpeed: 45,
    pauseAfterType: 2000,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [artRes, exRes] = await Promise.all([
          API.get("/artworks"),
          API.get("/exhibitions"),
        ]);
        setArtworks(artRes.data);
        setExhibitions(exRes.data);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const featuredArt = artworks.filter(a => !a.isSold).slice(0, 6);
  const liveAuctions = artworks.filter(a => a.isAuction && !a.isSold && a.status === "approved");
  const artists = [];
  const seenIds = new Set();
  artworks.forEach(a => {
    const id = a.artist?._id;
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      artists.push(a.artist);
    }
  });
  const featuredArtists = artists.slice(0, 8);

  useEffect(() => {
    if (featuredArt.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % Math.min(featuredArt.length, 5));
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredArt.length]);

  if (loading) return <LoadingSpinner />;

  const heroArt = featuredArt[currentSlide];

  return (
    <div className="text-white">

      {/* ── HERO SECTION ── */}
      <section
        className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f0f20 100%)",
        }}
      >
        {heroArt && (
          <div
            className="absolute inset-0 opacity-20 transition-all duration-1000"
            style={{
              backgroundImage: `url(${heroArt.imageUrl || heroArt.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(40px)",
            }}
          />
        )}

        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-20">

          <div className="space-y-6">
            <p className="text-[#6c3483] text-sm font-bold uppercase tracking-[0.3em]">
              Online Art Curation & Auction Platform
            </p>

            {/* ── Animated hero heading ── */}
            <h1
              className="text-5xl md:text-6xl font-black text-white leading-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {/* Typing animated word with cursor blink */}
              <span className="text-[#6c3483]">
                {typedWord}
                <span
                  style={{
                    display: "inline-block",
                    width: "3px",
                    height: "0.85em",
                    background: "#6c3483",
                    marginLeft: "3px",
                    verticalAlign: "text-bottom",
                    animation: "blink 1s step-end infinite",
                  }}
                />
              </span>
              <br />
              the World's<br />
              Finest Art
            </h1>

            {/* Cursor blink keyframe — injected inline once */}
            <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

            <p className="text-gray-300 text-lg leading-relaxed max-w-md">
              ArtSphere connects extraordinary artists with passionate collectors.
              Browse curated galleries, join live auctions, and own exceptional art.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/browse")}
                className="px-8 py-4 bg-[#6c3483] rounded-xl font-black text-white text-lg hover:bg-opacity-90 transition shadow-lg shadow-purple-900/30"
              >
                Browse Art
              </button>
              {!user && (
                <button
                  onClick={() => navigate("/register")}
                  className="px-8 py-4 bg-white/10 border border-white/20 rounded-xl font-black text-white text-lg hover:bg-white/20 transition backdrop-blur-sm"
                >
                  Join as Artist
                </button>
              )}
              {liveAuctions.length > 0 && (
                <button
                  onClick={() => navigate("/browse")}
                  className="px-8 py-4 bg-green-700/40 border border-green-600 rounded-xl font-black text-green-300 text-lg hover:bg-green-700/60 transition flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  {liveAuctions.length} Live Now
                </button>
              )}
            </div>

            {featuredArt.length > 1 && (
              <div className="flex gap-2 pt-2">
                {featuredArt.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? "w-8 h-2 bg-[#6c3483]"
                        : "w-2 h-2 bg-gray-600 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {heroArt && (
            <div
              onClick={() => navigate(`/art/${heroArt._id}`)}
              className="relative cursor-pointer group"
            >
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  padding: "10px",
                  background: "linear-gradient(145deg, #2a1a0a, #1a0f05, #3d2b1a)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
                }}
              >
                <img
                  src={heroArt.imageUrl || heroArt.image}
                  alt={heroArt.title}
                  className="w-full h-80 object-cover rounded-xl group-hover:brightness-110 transition-all duration-300"
                />
              </div>
              <div className="mt-4 px-2">
                <p
                  className="text-white font-bold text-xl truncate"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {heroArt.title}
                </p>
                <p className="text-gray-400 text-sm">
                  {heroArt.artist?.name || "Unknown Artist"}
                </p>
                <p className="text-[#6c3483] font-black mt-1">
                  {heroArt.isAuction
                    ? `Current Bid: $${heroArt.currentBid || heroArt.auctionStartPrice || 0}`
                    : `$${heroArt.price}`
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0f0f1a] to-transparent" />
      </section>

      {/* ── LIVE AUCTIONS STRIP ── */}
      {liveAuctions.length > 0 && (
        <section className="bg-[#0f0f1a] py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                <h2
                  className="text-2xl font-black text-white"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Live Auctions
                </h2>
              </div>
              <button
                onClick={() => navigate("/browse")}
                className="text-[#6c3483] text-sm hover:underline font-bold"
              >
                View all →
              </button>
            </div>

            <div
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#6c3483 #1a1a2e" }}
            >
              {liveAuctions.slice(0, 6).map(art => (
                <div
                  key={art._id}
                  onClick={() => navigate(`/art/${art._id}`)}
                  className="flex-shrink-0 w-64 bg-[#1e1e38] border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-[#6c3483] transition group"
                >
                  <div className="relative">
                    <img
                      src={art.imageUrl || art.image}
                      alt={art.title}
                      className="w-full h-40 object-cover group-hover:brightness-110 transition"
                    />
                    <div className="absolute top-2 left-2 bg-green-900/80 border border-green-700 text-green-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      LIVE
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="font-bold text-white truncate">{art.title}</p>
                    <p className="text-[#6c3483] font-black text-sm">
                      ${art.currentBid || art.auctionStartPrice || 0}
                    </p>
                    {art.auctionEndTime && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">Ends in:</span>
                        <CountdownTimer endTime={art.auctionEndTime} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED ARTWORKS GRID — ArtCard already has magnetic built in ── */}
      <section className="bg-[#0a0a1a] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[#6c3483] text-xs font-bold uppercase tracking-widest mb-1">
                Curated Selection
              </p>
              <h2
                className="text-3xl font-black text-white"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Featured Artworks
              </h2>
            </div>
            <button
              onClick={() => navigate("/browse")}
              className="text-[#6c3483] text-sm hover:underline font-bold"
            >
              Browse all →
            </button>
          </div>

          {featuredArt.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-4">🎨</p>
              <p>No artworks yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArt.slice(0, 6).map(art => (
                <ArtCard key={art._id} art={art} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── ARTIST SPOTLIGHT ── */}
      {featuredArtists.length > 0 && (
        <section className="bg-[#0f0f1a] py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <p className="text-[#6c3483] text-xs font-bold uppercase tracking-widest mb-1">
                Meet the Creators
              </p>
              <h2
                className="text-3xl font-black text-white"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Artist Spotlight
              </h2>
            </div>

            <div
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#6c3483 #1a1a2e" }}
            >
              {featuredArtists.map(artist => (
                <div key={artist._id} className="flex-shrink-0">
                  <ArtistCard artist={artist} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── EXHIBITIONS ── */}
      {exhibitions.length > 0 && (
        <section className="bg-[#0a0a1a] py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[#6c3483] text-xs font-bold uppercase tracking-widest mb-1">
                  Curated Shows
                </p>
                <h2
                  className="text-3xl font-black text-white"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Active Exhibitions
                </h2>
              </div>
              <button
                onClick={() => navigate("/exhibitions")}
                className="text-[#6c3483] text-sm hover:underline font-bold"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {exhibitions.slice(0, 3).map(ex => {
                const preview = ex.artworks?.[0]?.imageUrl || ex.artworks?.[0]?.image;
                return (
                  <div
                    key={ex._id}
                    onClick={() => navigate(`/exhibition/${ex._id}`)}
                    className="bg-[#1e1e38] border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-[#6c3483] hover:scale-[1.02] transition-all duration-300 group"
                  >
                    <div className="relative h-44 bg-[#16162a]">
                      {preview ? (
                        <img
                          src={preview}
                          alt={ex.title}
                          className="w-full h-full object-cover group-hover:brightness-110 transition"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                          🖼️
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-green-900/80 border border-green-700 text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                        Active
                      </div>
                    </div>
                    <div className="p-5">
                      <h3
                        className="font-bold text-white text-lg truncate"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {ex.title}
                      </h3>
                      <p className="text-[#6c3483] text-sm mt-1">
                        By {ex.createdBy?.name || "Unknown Artist"}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">
                        {ex.artworks?.length || 0} artworks
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER CTA ── */}
      <section
        className="py-20 px-4 text-center"
        style={{
          backgroundImage: "linear-gradient(135deg, #1a1a2e 0%, rgba(108,52,131,0.2) 50%, #1a1a2e 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <h2
            className="text-4xl font-black text-white"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Ready to Start Collecting?
          </h2>
          <p className="text-gray-400 text-lg">
            Join thousands of art lovers discovering extraordinary works every day.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate("/browse")}
              className="px-8 py-4 bg-[#6c3483] rounded-xl font-black text-white text-lg hover:bg-opacity-90 transition"
            >
              Explore Gallery
            </button>
            {!user && (
              <button
                onClick={() => navigate("/register")}
                className="px-8 py-4 bg-white/10 border border-white/20 rounded-xl font-black text-white text-lg hover:bg-white/20 transition"
              >
                Create Account
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0a0a1a] border-t border-gray-800 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3
              className="text-2xl font-black text-[#6c3483]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              ArtSphere
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Online Art Curation & Smart Auction Platform
            </p>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <button onClick={() => navigate("/browse")} className="hover:text-white transition">Browse</button>
            <button onClick={() => navigate("/exhibitions")} className="hover:text-white transition">Exhibitions</button>
            {!user && (
              <>
                <button onClick={() => navigate("/login")} className="hover:text-white transition">Login</button>
                <button onClick={() => navigate("/register")} className="hover:text-white transition">Register</button>
              </>
            )}
          </div>
          <p className="text-gray-600 text-xs">
            © 2026 ArtSphere. 4th Year CSE Project.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;