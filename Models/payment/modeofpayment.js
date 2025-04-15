const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const modeOfPaymentSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['credit_card', 'debit_card', 'net_banking', 'upi', 'wallet', 'cash_on_delivery', 'bank_transfer', 'other'],
    default: 'other'
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  requiresAuthorization: {
    type: Boolean,
    default: false
  },
  processingFee: {
    type: Number,
    default: 0
  },
  minAmount: Number,
  maxAmount: Number,
  iconUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
modeOfPaymentSchema.index({ name: 1 });
modeOfPaymentSchema.index({ isActive: 1 });

const ModeOfPayment = mongoose.model('ModeOfPayment', modeOfPaymentSchema);

module.exports = ModeOfPayment;