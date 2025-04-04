const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
 
  dietaryPreference: {
    type: String,
    required: true
  },
  allergies: String,
  specialRequests: String,
  mealQuantity: {
    type: Number,
    default: 1
  }
});

module.exports = mongoose.model('Member', memberSchema);