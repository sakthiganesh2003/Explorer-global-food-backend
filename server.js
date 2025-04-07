require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Import Routes
const authRoutes = require("./Routes/Authroutes");
const maidRoutes = require("./Routes/maidroutes");
const maidDashRoutes = require('./Routes/maiddashroutes');
const memberRoutes = require('./Routes/memberRoutes');
const cuisineTypeRoutes = require("./Routes/cuisineTypeRoutes");
const formMaidRoutes = require("./Routes/formmaidroutes");
const timeSlotRoutes = require("./Routes/timeSlotRoutes");
const foodRoutes = require('./Routes/foodRoutes');
// const bookingRoutes = require('./Routes/booking/selectmaidroutes');
const selectMaidRouter = require('./Routes/booking/selectmaidroutes');


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
app.use('/api/maid', maidDashRoutes);
app.use('/api/members', memberRoutes);
app.use("/api/cuisine-types", cuisineTypeRoutes);
app.use('/api/formMaids', formMaidRoutes);
app.use("/api/time", timeSlotRoutes);
app.use('/api/foods', foodRoutes);
// app.use('/api/booking', bookingRoutes);
app.use('/api/maids', selectMaidRouter);


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
