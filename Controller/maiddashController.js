const mongoose = require('mongoose');
const Maid = require('../Models/maid');
const multer = require('multer');
const fetch = require('node-fetch');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const getMaidProfile = async (req, res) => {
  try {
    const userId = req.params;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user ID found in request',
      });
    }

    console.log('Received userId:', userId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        receivedId: userId,
        expectedFormat: '24-character hexadecimal string',
      });
    }

    const objectId = new mongoose.Types.ObjectId(userId);
    const maid = await Maid.findOne({ userId: objectId });

    if (!maid) {
      return res.status(404).json({
        success: false,
        message: 'Maid profile not found',
        suggestedAction: 'Please complete your profile setup',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: maid._id.toString(),
        userId: maid.userId.toString(),
        fullName: maid.fullName,
        specialties: maid.specialties,
        rating: maid.rating,
        experience: maid.experience,
        image:'chef1.jpg',
        isActive: maid.active,
        description: maid.description || 'Professional chef',
      },
    });
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const updateMaidProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Validate required fields
    const { fullName, specialties, rating, experience } = req.body;
    if (!fullName || !specialties || !rating || !experience) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fullName, specialties, rating, experience',
      });
    }

    // Handle image upload to Cloudinary
    let imageUrl = req.body.image || 'https://res.cloudinary.com/default.jpg'; // Fallback image
    if (req.file) {
      const formData = new FormData();
      formData.append('file', req.file.buffer.toString('base64'));
      formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Cloudinary upload failed');
      }
      imageUrl = data.secure_url;
    }

    const updatedMaid = await Maid.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          fullName,
          specialties: specialties.split(',').map(s => s.trim()), // Handle comma-separated specialties
          rating: parseFloat(rating),
          experience,
          image: imageUrl,
          userId: new mongoose.Types.ObjectId(userId),
          active: true, // Default for new profiles
          description: req.body.description || 'Professional chef',
        },
      },
      { new: true, runValidators: true, upsert: true } // Create if not exists
    );

    return res.status(200).json({
      success: true,
      data: updatedMaid,
    });
  } catch (error) {
    console.error('Error updating/creating maid profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update/create profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const toggleActiveStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const maid = await Maid.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!maid) {
      return res.status(404).json({
        success: false,
        message: 'Maid profile not found',
      });
    }

    maid.active = !maid.active;
    await maid.save();

    return res.status(200).json({
      success: true,
      data: {
        id: maid._id,
        isActive: maid.active,
      },
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getMaidProfile,
  updateMaidProfile: [upload.single('image'), updateMaidProfile], // Add multer middleware
  toggleActiveStatus,
};