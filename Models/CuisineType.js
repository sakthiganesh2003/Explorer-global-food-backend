const mongoose = require("mongoose");

const CuisineTypeSchema = new mongoose.Schema({
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  cuisine_type: {
    type: String,
    enum: ["Indian", "American", "Chinese", "Continental"],
    default: "Indian",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  order: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("CuisineType", CuisineTypeSchema);
