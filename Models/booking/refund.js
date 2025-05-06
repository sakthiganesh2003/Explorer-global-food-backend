const mongoose = require("mongoose");

const RefundSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["refunded", "pending"],
      default: "pending",
    },
    proof: { type: String, default: null },
    adminComment: { type: String, default: null },
    refundedAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt" } }
);

// Create the Refund model
const Refunds = mongoose.model("Refunds", RefundSchema);

// Export the Refund model
module.exports = { Refunds };