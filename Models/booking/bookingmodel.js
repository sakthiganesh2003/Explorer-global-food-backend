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
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'] },
  time: { type: [String], required: true },
  address: { type: String, required: true },
  phoneNumber: { type: String, required: true, match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number (10-15 digits, optional + prefix)'] },
});

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  maidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference User schema
    required: true,
  },
  cuisine: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: false, default: 0 }, // Optional to match frontend
  },
  members: { type: [memberSchema], default: [] },
  time: { type: timeSlotSchema, required: true },
  confirmedFoods: { type: [foodItemSchema], default: [] },
  totalAmount: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
});

module.exports = mongoose.model('Booking', bookingSchema);