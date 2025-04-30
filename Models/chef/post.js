const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    chef_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chef', required: true },
    image_videos: {
      url: { type: String, required: true },
      public_id: { type: String }, // Remove required: true
    },
    recipe_name: { type: String, required: true },
    category_type: { type: String, required: true },
    instructions: { type: String, required: true },
    date_time: { type: Date, required: true },
    cuisine_type: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  });
  
  module.exports = mongoose.model('Recipe', recipeSchema);