import express from "express";
import Exhibition from "../models/Exhibition.js";
import { protect } from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminMiddleware.js";

const router = express.Router();

/* ---------------- CREATE EXHIBITION (Artist) ---------------- */
router.post("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "artist") {
      return res.status(403).json({ message: "Only artists can create exhibitions" });
    }

    const { title, description, artworks, startDate, endDate } = req.body;

    const exhibition = await Exhibition.create({
      title,
      description,
      artworks,
      startDate,
      endDate,
      createdBy: req.user.id,
    });

    res.status(201).json(exhibition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ---------------- GET ALL APPROVED EXHIBITIONS (Public) ---------------- */
router.get("/", async (req, res) => {
  try {
    const exhibitions = await Exhibition.find({ status: "approved" })
      .populate("artworks")
      .populate("createdBy", "name email");

    res.json(exhibitions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ---------------- ADMIN APPROVE EXHIBITION ---------------- */
router.put("/:id/approve", protect, adminOnly, async (req, res) => {
  try {
    const exhibition = await Exhibition.findById(req.params.id);

    if (!exhibition) {
      return res.status(404).json({ message: "Exhibition not found" });
    }

    exhibition.status = "approved";
    await exhibition.save();

    res.json({ message: "Exhibition approved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ---------------- ADMIN REJECT EXHIBITION ---------------- */
router.put("/:id/reject", protect, adminOnly, async (req, res) => {
  try {
    const exhibition = await Exhibition.findById(req.params.id);

    if (!exhibition) {
      return res.status(404).json({ message: "Exhibition not found" });
    }

    exhibition.status = "rejected";
    await exhibition.save();

    res.json({ message: "Exhibition rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;