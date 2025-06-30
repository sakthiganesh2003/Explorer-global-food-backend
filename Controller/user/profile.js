const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const cloudinary = require('../../config/cloudinary').cloudinary;
const UserProfile = require('../../Models/userprofile');
const User = require('../../Models/Users')
// @desc    Create user profile
// @route   POST /api/profile/profile
// @access  Private
const createUserProfile = asyncHandler(async (req, res) => {
  // Log the raw request body and file
  console.log('req.body:', req.body);
  console.log('req.file:', req.file ? {
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  } : 'No file uploaded');

  // Extract fields from req.body
  const userId = req.body.userId;
  const phone = req.body.phone || '';
  const address = req.body.address || { city: '', country: '' };
  const birthDate = req.body.birthDate || '';
  const gender = req.body.gender || 'Prefer not to say';
  const bio = req.body.bio || '';

  // Validate required fields
  if (!userId) {
    res.status(400);
    throw new Error('User ID is required');
  }

  if (!mongoose.isValidObjectId(userId)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  // Check if profile already exists for the user
  const existingProfile = await UserProfile.findOne({ userId });
  if (existingProfile) {
    res.status(400);
    throw new Error('User profile already exists');
  }

  // Handle image upload to Cloudinary
  let imageUrl = 'https://randomuser.me/api/portraits/men/1.jpg'; // Default image
  if (req.file) {
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'user_profiles' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error.message);
      res.status(500);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Create new user profile
  const userProfile = new UserProfile({
    userId,
    image: imageUrl,
    phone,
    address: { city: address.city || '', country: address.country || '' },
    birthDate,
    gender,
    bio
  });

  // Save the profile
  const savedProfile = await userProfile.save();
  console.log(savedProfile)
  res.status(201).json({
    success: true,
    message: 'User profile created successfully',
    data: {
      ...savedProfile._doc,
      address: savedProfile.address || { city: '', country: '' }
    }
  });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Validate user ID format
  if (!mongoose.isValidObjectId(userId)) {
    res.status(400);
    throw new Error('Invalid user ID format');
  }

  // Fetch user profile and populate userId with specific fields from User schema
  const userProfile = await UserProfile.findOne({ userId })
    .populate({
      path: 'userId',
      select: 'name email isVerified role', // Include only necessary fields, exclude password
    });

  // Check if user profile exists
  if (!userProfile) {
    res.status(404);
    throw new Error('User profile not found');
  }

  // Construct response, ensuring address is included with defaults
  res.status(200).json({
    _id: userProfile._id,
    userId: userProfile.userId._id,
    name: userProfile.userId.name || '',
    email: userProfile.userId.email || '',
    role: userProfile.userId.role || 'user',
    phone:userProfile.phone,
    isVerified: userProfile.userId.isVerified || false,
    bio: userProfile.bio || '',
    address: userProfile.address || { city: '', country: '' },
    createdAt: userProfile.createdAt,
    updatedAt: userProfile.updatedAt,
  });
});
  
  // @desc    Update user profile
  // @route   PUT /api/profile/profile/user/:id
  // @access  Private
  const updateUserProfile = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400);
      throw new Error('Invalid user ID format');
    }
  
    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      res.status(404);
      throw new Error('User profile not found');
    }
  
    const { phone, address, birthDate, gender, bio } = req.body;
  
    // Handle image upload to Cloudinary
    let imageUrl = userProfile.image;
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'user_profiles' },
            (error, result) => {
              if (error) reject(error);
            else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
        imageUrl = result.secure_url;
      } catch (error) {
        res.status(500);
        throw new Error('Image upload failed');
      }
    }
  
    // Update user profile fields
    userProfile.phone = phone || userProfile.phone;
    userProfile.address = address ? { city: address.city || '', country: address.country || '' } : userProfile.address;
    userProfile.birthDate = birthDate || userProfile.birthDate;
    userProfile.gender = gender || userProfile.gender;
    userProfile.bio = bio || userProfile.bio;
    userProfile.image = imageUrl;
  
    const updatedProfile = await userProfile.save();
    res.status(200).json({
      ...updatedProfile._doc,
      address: updatedProfile.address || { city: '', country: '' }
    });
  });

module.exports = {
  createUserProfile,
  getUserProfile,
  updateUserProfile
};