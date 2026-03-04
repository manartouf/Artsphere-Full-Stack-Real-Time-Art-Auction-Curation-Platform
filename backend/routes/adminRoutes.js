import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminMiddleware.js";
import User from "../models/User.js";
import Art from "../models/Art.js";
import Exhibition from "../models/Exhibition.js";

const router = express.Router();

/* ================= USER MANAGEMENT ================= */

// Get all users
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete("/users/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= ART MANAGEMENT ================= */

// Get all artworks
router.get("/artworks", protect, adminOnly, async (req, res) => {
  try {
    const artworks = await Art.find()
      .populate("artist", "name email role")
      .populate("highestBidder", "name email");

    res.json(artworks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ APPROVE ARTWORK
router.put("/artworks/:id/approve", protect, adminOnly, async (req, res) => {
  try {
    const artwork = await Art.findById(req.params.id);
    if (!artwork)
      return res.status(404).json({ message: "Artwork not found" });

    artwork.status = "approved";
    await artwork.save();

    res.json({ message: "Artwork approved successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ REJECT ARTWORK
router.put("/artworks/:id/reject", protect, adminOnly, async (req, res) => {
  try {
    const artwork = await Art.findById(req.params.id);
    if (!artwork)
      return res.status(404).json({ message: "Artwork not found" });

    artwork.status = "rejected";
    await artwork.save();

    res.json({ message: "Artwork rejected successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete artwork
router.delete("/artworks/:id", protect, adminOnly, async (req, res) => {
  try {
    const artwork = await Art.findById(req.params.id);
    if (!artwork)
      return res.status(404).json({ message: "Artwork not found" });

    await artwork.deleteOne();
    res.json({ message: "Artwork deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ================= EXHIBITION MANAGEMENT ================= */

// Get all exhibitions (including pending)
router.get("/exhibitions", protect, adminOnly, async (req, res) => {
  try {
    const exhibitions = await Exhibition.find()
      .populate("createdBy", "name email")
      .populate("artworks");

    res.json(exhibitions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete exhibition
router.delete("/exhibitions/:id", protect, adminOnly, async (req, res) => {
  try {
    const exhibition = await Exhibition.findById(req.params.id);
    if (!exhibition)
      return res.status(404).json({ message: "Exhibition not found" });

    await exhibition.deleteOne();
    res.json({ message: "Exhibition deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// END AUCTION MANUALLY
router.put("/artworks/:id/end", protect, adminOnly, async (req, res) => {
  try {
    const art = await Art.findById(req.params.id);

    if (!art) {
      return res.status(404).json({ message: "Artwork not found" });
    }

    art.auctionStatus = "ended";
    art.isSold = true;
    art.soldPrice = art.currentBid;

    await art.save();

    res.json({ message: "Auction ended successfully", art });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= ADMIN ANALYTICS =================

router.get("/analytics", protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalArtworks = await Art.countDocuments();
    const totalAuctions = await Art.countDocuments({ isAuction: true });
    const activeAuctions = await Art.countDocuments({
      isAuction: true,
      auctionStatus: "active",
    });
    const soldArtworks = await Art.countDocuments({ isSold: true });

    res.json({
      totalUsers,
      totalArtworks,
      totalAuctions,
      activeAuctions,
      soldArtworks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;