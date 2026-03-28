const mongoose = require("mongoose");

const guideSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: [true, "User reference is required"],
    unique: true
  },
  languages: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Language", 
    required: [true, "At least one language is required"],
  }],
  bio: { 
    type: String, 
    required: [true, "Bio is required"],
    minlength: [50, "Bio must be at least 50 characters"],
    maxlength: [500, "Bio cannot exceed 500 characters"]
  },
  serviceLocations: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'City',
  }],
  activities: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Activity",
    required: [true, "At least one activity is required"],
  }],
  bankAccountNumber: { 
    type: String, 
    required: [true, "Bank account number is required"],
    validate: {
      validator: (v) => /^[0-9]{9,18}$/.test(v),
      message: "Invalid bank account number format"
    }
  },
  ifscCode: { // Added IFSC code
    type: String,
    required: [true, "IFSC code is required"],
    validate: {
      validator: (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), // Standard IFSC format
      message: "Invalid IFSC code format (e.g., SBIN0001234)"
    }
  },
  bankName: { // Added bank name
    type: String,
    required: [true, "Bank name is required"],
    minlength: [2, "Bank name must be at least 2 characters"],
    maxlength: [100, "Bank name cannot exceed 100 characters"]
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending"
  },
  rejectionReason: {
    type: String,
    default: ""
  },
  lastVerifiedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
guideSchema.index({ verificationStatus: 1 });
guideSchema.index({ serviceLocations: 1 });
guideSchema.index({ activities: 1 });

// Virtual for formatted bank account (last 4 digits)
guideSchema.virtual('maskedBankAccount').get(function() {
  return this.bankAccountNumber 
    ? `**** ${this.bankAccountNumber.slice(-4)}` 
    : '';
});

// Removed pre-save hook for aadharCardPhoto since it's no longer present

const Guide = mongoose.model("Guide", guideSchema);
module.exports = Guide;