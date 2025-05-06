const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  avatar: { type: String, default: '' }, // Cloudinary URL
  avatarPublicId: { type: String, default: '' }, // Cloudinary public ID
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Userprofile', userSchema);
