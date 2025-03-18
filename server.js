require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Import Routes
const authRoutes = require("./Routes/Authroutes");
const maidRoutes = require("./Routes/maidroutes");


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/maids", maidRoutes);
  // Make sure this matches the controller

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
