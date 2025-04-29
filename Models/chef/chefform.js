// Models/chef/chefform.js
const mongoose = require('mongoose');

const chefSchema = new mongoose.Schema({
  name: { type: String, required: true },
  experienceYears: { type: Number, required: true },
  specialty: { type: String, required: true },
  certification: {
    public_id: String,
    url: String,
  },
  agreeToTerms: { type: Boolean, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Chef', chefSchema);