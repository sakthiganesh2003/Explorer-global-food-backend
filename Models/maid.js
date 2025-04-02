const mongoose = require("mongoose");

const maidSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
  specialties: { type: [String], required: true },
  rating: { type: Number, required: true },
  experience: {
    type: String,
    required: [true, 'Experience level is required'],
    enum: {
      values: ['0-1 years', '1-3 years', '3-5 years', '5+ years'],
      message: 'Please select a valid experience range'
    }
  },
  image: { type: String, required: true }
});

const Maid = mongoose.model("Maid", maidSchema);

module.exports = Maid;

// select cuisine

