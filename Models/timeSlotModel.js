const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  times: {
    type: String,
    required: [true, 'Time range is required'],
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  timeSlots: [{
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
    },
    isBooked: {
      type: Boolean,
      default: false
    }
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maid',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for better query performance
timeSlotSchema.index({ date: 1, maidId: 1 });
timeSlotSchema.index({ userId: 1 });

// Validate that end time is after start time for each time slot
timeSlotSchema.pre('save', function(next) {
  for (const slot of this.timeSlots) {
    const start = new Date(`1970-01-01T${slot.startTime}:00`);
    const end = new Date(`1970-01-01T${slot.endTime}:00`);
    
    if (end <= start) {
      throw new Error(`End time (${slot.endTime}) must be after start time (${slot.startTime})`);
    }
  }
  next();
});

module.exports = mongoose.model('Schedule', timeSlotSchema);