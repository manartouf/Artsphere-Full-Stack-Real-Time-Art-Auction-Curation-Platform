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
import { protect } from "./middleware/authMiddleware.js";// ✅ UNCOMMENTED
import adminOnly from "./middleware/adminMiddleware.js"; // ✅ ADMIN MIDDLEWARE
import artRoutes from "./routes/artRoutes.js";

dotenv.config();

const app = express();

/* -------------------- SOCKET SERVER SETUP -------------------- */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // later replace with frontend URL
    methods: ["GET", "POST"],
  },
});

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());

/* -------------------- ROUTES -------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/art", artRoutes);
app.use("/api/exhibitions", exhibitionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);

/* -------------------- ADMIN TEST ROUTE -------------------- */
app.get("/api/admin-test", protect, adminOnly, (req, res) => {
  res.json("Admin access granted!");
});

/* -------------------- REAL-TIME BIDDING -------------------- */
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Listen for new bid
  socket.on("newBid", (data) => {
    console.log("💰 New bid received:", data);

    // Broadcast to ALL connected users
    io.emit("bidUpdate", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

/* -------------------- DATABASE -------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ Connection Error:", err));

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running with Socket.IO on port ${PORT}`);
});

export { io };