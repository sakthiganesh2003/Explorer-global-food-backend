const mongoose = require('mongoose');
const Maid = require('../maid');
const Member = require('../member');

const BookingSchema = new mongoose.Schema({
  maid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maid',
    required: [true, 'Please select a maid']
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Please provide a member']
  },
  services: {
    type: [String],
    required: [true, 'Please select at least one service']
  },
  timeSlot: {
    type: String,
    required: [true, 'Please select a time slot']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to check maid availability
BookingSchema.statics.isMaidAvailable = async function(maidId, timeSlot) {
  const existingBooking = await this.findOne({
    maid: maidId,
    timeSlot,
    status: { $in: ['confirmed', 'pending'] }
  });
  
  return !existingBooking;
};

module.exports = mongoose.model('Booking', BookingSchema);