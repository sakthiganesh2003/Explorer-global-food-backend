const mongoose = require('mongoose');

const maidSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  experience: String,
  specialties: [String],
  bio: String,
  availability: [String],
  aadhaarPhoto: String,
  aadhaarNumber: String
});

module.exports = mongoose.model('Maid', maidSchema);
