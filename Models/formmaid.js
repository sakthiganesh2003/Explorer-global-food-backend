const mongoose = require('mongoose');

const formmaidSchema = new mongoose.Schema({
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

module.exports = mongoose.model('formMaid', formmaidSchema);

