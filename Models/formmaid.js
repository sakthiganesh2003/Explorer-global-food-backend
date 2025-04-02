const mongoose = require('mongoose');

const formmaidSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
    userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,  // This already creates an index
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  experience: {
    type: String,
    required: [true, 'Experience level is required'],
    enum: {
      values: ['0-1 years', '1-3 years', '3-5 years', '5+ years'],
      message: 'Please select a valid experience range'
    }
  },
  specialties: {
    type: [String],
    required: [true, 'At least one specialty is required'],
    enum: {
      values: ['Indian', 'Italian', 'Chinese', 'Mexican', 'Thai', 'Japanese', 'Mediterranean', 'Other'],
      message: 'Invalid cuisine specialty selected'
    }
  },
  bio: {
    type: String,
    required: [true, 'Bio is required'],
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  aadhaarPhoto: {
    type: String,
    required: [true, 'Aadhaar photo is required']
  },
  aadhaarNumber: {
    type: String,
    required: [true, 'Aadhaar number is required'],
    match: [/^[0-9]{12}$/, 'Aadhaar number must be 12 digits']
  },
  bankDetails: {
    accountNumber: {
      type: String,
      required: [true, 'Bank account number is required'],
      match: [/^[0-9]{9,18}$/, 'Account number must be 9-18 digits']
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format']
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Only define additional indexes that aren't already covered by 'unique: true'
formmaidSchema.index({ status: 1 });
formmaidSchema.index({ 'bankDetails.accountNumber': 1 });

module.exports = mongoose.model('formMaid', formmaidSchema);