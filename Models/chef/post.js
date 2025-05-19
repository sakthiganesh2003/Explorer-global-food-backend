const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  recipe_name: { type: String, required: true },
  
  category_type: { type: String, required: true },
  instructions: { type: String, required: true },
  date_time: { type: Date, default: Date.now },
  cuisine_type: { type: String, required: true },
  ingredients: { type: [String], required: true },
  prep_time: { type: String },
  cook_time: { type: String },
  servings: { type: String },
  media: {
    url: String,
    public_id: String,
    media_type: String,
    width: Number,
    height: Number,
    format: String,
    duration: Number,},
    
  created_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);