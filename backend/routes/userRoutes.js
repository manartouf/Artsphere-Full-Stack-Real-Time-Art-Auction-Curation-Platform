import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import Art from "../models/Art.js";

const router = express.Router();

// FOLLOW ARTIST
router.put("/follow/:id", protect, async (req, res) => {
  try {
    const artist = await User.findById(req.params.id);
    const user = await User.findById(req.user.id);

    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    if (artist.role !== "artist") {
      return res.status(400).json({ message: "You can only follow artists" });
    }

    if (artist._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    if (user.following.includes(artist._id)) {
      return res.status(400).json({ message: "Already following this artist" });
    }

    user.following.push(artist._id);
    artist.followers.push(user._id);

    await user.save();
    await artist.save();

    res.json({ message: "Artist followed successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET MY NOTIFICATIONS
router.get("/notifications", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json(user.notifications);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MARK NOTIFICATION AS READ
router.put("/notifications/:notificationId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const notification = user.notifications.id(req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;

    await user.save();

    res.json({ message: "Notification marked as read" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET MY PURCHASES (Buyer)
router.get("/my-purchases", protect, async (req, res) => {
  try {
    const purchases = await Art.find({ buyer: req.user.id })
      .populate("artist", "name email")
      .populate("buyer", "name email");

    res.json(purchases);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET MY SALES (Artist)
router.get("/my-sales", protect, async (req, res) => {
  try {
    const sales = await Art.find({
      artist: req.user.id,
      isSold: true
    })
      .populate("buyer", "name email")
      .populate("artist", "name email");

    res.json(sales);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;