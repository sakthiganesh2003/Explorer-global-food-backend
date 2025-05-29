const User = require('../../Models/Users');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Get user profile
// @route   GET /api/users/profile/user/:id
// @access  Private (or Public, depending on your use case)
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.params.id; // Use URL parameter
  if (!mongoose.isValidObjectId(userId)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json(user);
});

// @desc    Update user profile
// @route   PUT /api/users/profile/user/:id
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.params.id; // Use URL parameter
  if (!mongoose.isValidObjectId(userId)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, email, phone, address, birthDate, gender, bio } = req.body;

  user.name = name || user.name;
  user.email = email || user.email;
  user.phone = phone || user.phone;
  user.address = address || user.address;
  user.birthDate = birthDate || user.birthDate;
  user.gender = gender || user.gender;
  user.bio = bio || user.bio;

  if (req.body.image) {
    user.image = req.body.image;
  }

  const updatedUser = await user.save();
  res.status(200).json(updatedUser);
});

module.exports = {
  getUserProfile,
  updateUserProfile,
};