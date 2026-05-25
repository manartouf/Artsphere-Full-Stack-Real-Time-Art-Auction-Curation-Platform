import auctionRoutes from './routes/auctionRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import publicRoutes from "./routes/publicRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import exhibitionRoutes from "./routes/exhibitionRoutes.js";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import { protect } from "./middleware/authMiddleware.js";
import adminOnly from "./middleware/adminMiddleware.js";
import artRoutes from "./routes/artRoutes.js";
import Art from "./models/Art.js";
import Auction from "./models/Auction.js";
import User from "./models/User.js";

dotenv.config();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.use(cors({
  origin: [process.env.CLIENT_URL, "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/artworks", artRoutes);
app.use("/api/exhibitions", exhibitionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/public", publicRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/auctions', auctionRoutes);

app.get("/api/admin-test", protect, adminOnly, (req, res) => {
  res.json("Admin access granted!");
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);
  socket.on("newBid", (data) => {
    io.emit("bidUpdate", data);
  });
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

const cleanupStaleAuctionFlags = async () => {
  try {
    const endedAuctions = await Auction.find({ status: "ended" })
      .populate({ path: "collectionId", populate: { path: "artworks" } });

    for (const auction of endedAuctions) {
      if (!auction.collectionId?.artworks?.length) continue;
      const artworkIds = auction.collectionId.artworks.map(a => a._id || a);
      await Art.updateMany(
        { _id: { $in: artworkIds }, isSold: false, isAuction: true },
        { isAuction: false, auctionStatus: "ended" }
      );
    }
    console.log("✅ Stale auction flags cleaned up");
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
};

const runAuctionAutoEnd = async () => {
  try {
    const now = new Date();

    const expiredAuctions = await Auction.find({ status: "approved" })
      .populate({ path: "collectionId", populate: { path: "artworks" } })
      .populate("artistId", "name email followers");

    for (const auction of expiredAuctions) {
      if (!auction.collectionId) continue;

      const artworks = auction.collectionId.artworks;
      if (!artworks || artworks.length === 0) continue;

      const lastArtRef = artworks[artworks.length - 1];
      const lastArt = await Art.findById(lastArtRef._id || lastArtRef);
      if (!lastArt || !lastArt.auctionEndTime) continue;

      const globalEndTime = new Date(lastArt.auctionEndTime);

      if (now < globalEndTime) continue;

      auction.status = "ended";
      await auction.save();

      const artworkIds = artworks.map(a => a._id || a);

      await Art.updateMany(
        { _id: { $in: artworkIds } },
        { isAuction: false, auctionStatus: "ended" }
      );

      for (const artRef of artworks) {
        const art = await Art.findById(artRef._id || artRef).populate("highestBidder");
        if (!art || art.isSold) continue;

        if (art.highestBidder && art.currentBid > 0) {
          const winner = await User.findById(art.highestBidder._id || art.highestBidder);
          if (winner) {
            winner.walletBalance = Math.max(0, (winner.walletBalance || 0) - art.currentBid);
            winner.notifications.push({
              message: `🎉 You won the auction for "${art.title}" with a bid of $${art.currentBid}!`
            });
            await winner.save();
          }
          art.isSold = true;
          art.soldPrice = art.currentBid;
          art.buyer = art.highestBidder._id || art.highestBidder;
          art.soldWhere = "auction";
          await art.save();
        }
      }

      if (auction.artistId && auction.artistId.followers?.length > 0) {
        await User.updateMany(
          { _id: { $in: auction.artistId.followers } },
          {
            $push: {
              notifications: {
                message: `The auction "${auction.collectionId.name}" by ${auction.artistId.name} has ended.`
              }
            }
          }
        );
      }

      await User.findByIdAndUpdate(auction.artistId._id || auction.artistId, {
        $push: {
          notifications: {
            message: `Your auction "${auction.collectionId.name}" has ended.`
          }
        }
      });

      io.emit("auctionEnded", { auctionId: auction._id });
      console.log(`✅ Auto-ended auction: ${auction._id}`);
    }
  } catch (err) {
    console.error("Auction auto-end error:", err.message);
  }
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully");
    await cleanupStaleAuctionFlags();
    runAuctionAutoEnd();
    setInterval(runAuctionAutoEnd, 60 * 1000);
  })
  .catch((err) => console.log("❌ Connection Error:", err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running with Socket.IO on port ${PORT}`);
});

export { io };