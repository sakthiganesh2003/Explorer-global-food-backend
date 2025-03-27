const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  dietaryPreference: { type: String, required: true },
  userId :{type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
  allergies: { type: String, default: '' },
  specialRequests: { type: String, default: '' },
  mealQuantity: { type: Number, required: true, min: 1 },

});

module.exports = mongoose.model('Member', memberSchema);