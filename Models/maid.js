const mongoose = require("mongoose");

const maidSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cuisine: { type: [String], required: true },
  rating: { type: Number, required: true },
  experience: { type: Number, required: true },
  image: { type: String, required: true }
});

const Maid = mongoose.model("Maid", maidSchema);

module.exports = Maid;
