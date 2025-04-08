const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  dietaryPreference: { type: String, required: true },
  allergies: { type: String, default: '' },
  specialRequests: { type: String, default: '' },
  mealQuantity: { type: Number, required: true, min: 1 },
});

const foodItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const timeSlotSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: [String], required: true },
  address: { type: String, required: true },
  phoneNumber: { type: String, required: true, match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number'] },
});

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  maid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cuisine: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  members: [memberSchema],
  time: timeSlotSchema,
  confirmedFoods: [foodItemSchema],
  totalAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'confirmed', 'completed'], default: 'pending' },
});

module.exports = mongoose.model('Booking', bookingSchema);