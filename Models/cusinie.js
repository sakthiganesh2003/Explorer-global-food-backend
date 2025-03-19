const mongoose = require("mongoose");

const cuisineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String }, // Optional, for images of cuisines
});

const Cuisine = mongoose.model("Cuisine", cuisineSchema);
module.exports = Cuisine;
