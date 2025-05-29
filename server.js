require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

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
// const selectMaidRouter = require('./Routes/booking/selectmaidroutes');

//booking
const bookingRoutes = require('./Routes/booking/bookingroutes');
const bookingidroutes = require('./Routes/booking/bookingidroutes');

// payments
const paymentRoutes = require('./Routes/payments/paymentroutes');

//chef
const chefRoutes = require('./Routes/chef/chefformroutes');

const chefpostRoutes = require('./Routes/chef/postroutes');


// const modeofpaymentRoutes = require('./Routes/payments/');
//user
const userRoutes = require('./Routes/user/userprofileroutes');
const predefineRoutes = require('./Routes/user/predefine'); 

const refundsRoutes = require('./Routes/booking/refundroutes');
const locationRoutes = require('./Routes/locationRoute')
//feedback
const feedbackRoutes = require('./Routes/user/feedback');
const profile= require('./Routes/user/profile');

// // Increase payload size limit 50MB 
// app.use(bodyParser.json({ limit: '50mb' }));
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
  })
);



// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/maids", maidRoutes);
//maid dash
app.use('/api/maid', maidDashRoutes);


app.use('/api/members', memberRoutes);
app.use("/api/cuisine-types", cuisineTypeRoutes);
app.use('/api/formMaids', formMaidRoutes);
app.use("/api/time", timeSlotRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/locations',locationRoutes)
// app.use('/api/booking', bookingRoutes);
// app.use('/api/maids', selectMaidRouter);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes );
// app.use('/api/modeofpayment', modeofpaymentRoutes);
app.use('/api/book', bookingidroutes );


//chef routes
app.use('/api/chefs', chefRoutes);
app.use('/api/chefposts', chefpostRoutes);


//user routes
app.use('/api/user', userRoutes);
app.use('/api/predefine', predefineRoutes);



app.use('/api/refunds', refundsRoutes);


//feedback

app.use('/api/feedback/',feedbackRoutes)
app.use('/api/profile', profile);
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
