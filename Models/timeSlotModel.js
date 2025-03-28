const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  timeSlots: [{
    type: String,
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Schedule', scheduleSchema);