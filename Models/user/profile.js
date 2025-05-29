const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  image: {
    type: String,
    default: 'https://randomuser.me/api/portraits/men/1.jpg',
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    city: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
  },
  birthDate: {
    type: String,
    default: '',
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    default: 'Prefer not to say',
  },
  bio: {
    type: String,
    default: '',
  },
  joinedDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);