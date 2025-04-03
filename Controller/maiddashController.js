const mongoose = require('mongoose');  // Add this import at the top
const Maid = require('../Models/maid');

const getMaidProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Enhanced ID validation with better error reporting
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Debug: Log the received ID
        console.log('Received userId:', userId);

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                receivedId: userId,
                expectedFormat: '24-character hexadecimal string'
            });
        }

        // Convert to ObjectId safely
        const objectId = new mongoose.Types.ObjectId(userId);
        
        // Debug: Log the converted ObjectId
        console.log('Converted ObjectId:', objectId);

        // Find by userId field
        const maid = await Maid.findOne({ userId: objectId });

        if (!maid) {
            return res.status(404).json({
                success: false,
                message: 'Maid profile not found',
                suggestedAction: 'Please complete your profile setup'
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
                image: maid.image,
                isActive: maid.isActive || false,
                description: maid.description || "Professional chef"
            }
        });

    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const updateMaidProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const updatedMaid = await Maid.findByIdAndUpdate(
      userId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedMaid) {
      return res.status(404).json({
        success: false,
        message: 'Maid not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedMaid
    });

  } catch (error) {
    console.error('Error updating maid:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const toggleActiveStatus = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const maid = await Maid.findById(userId);
    
    if (!maid) {
      return res.status(404).json({
        success: false,
        message: 'Maid not found'
      });
    }

    maid.isActive = !maid.isActive;
    await maid.save();

    return res.status(200).json({
      success: true,
      data: {
        id: maid._id,
        isActive: maid.isActive
      }
    });

  } catch (error) {
    console.error('Error toggling status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getMaidProfile,
  updateMaidProfile,
  toggleActiveStatus
};