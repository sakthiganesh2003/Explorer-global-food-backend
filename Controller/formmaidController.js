const Maid = require('../Models/formmaid');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; // Use v2 explicitly
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { timeout } = require('promise-timeout');

// Load .env file explicitly
dotenv.config();
const app = express();

// Debug environment variables
console.log('Environment Variables:', {
  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer setup with memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validation helper
const validateInputs = (data) => {
  const errors = [];

  if (!data.userId) errors.push('User ID is required');
  if (!data.fullName?.trim()) errors.push('Full name is required');
  if (!data.email?.trim()) errors.push('Email is required');
  if (!data.phone?.trim()) errors.push('Phone is required');
  if (!data.experience) errors.push('Experience is required');
  if (!data.specialties || (Array.isArray(data.specialties) && data.specialties.length === 0)) {
    errors.push('At least one specialty is required');
  }
  if (!data.bio?.trim()) errors.push('Bio is required');
  if (!data.aadhaarNumber?.trim()) errors.push('Aadhaar number is required');
  if (!data.aadhaarPhoto) errors.push('Aadhaar photo is required');
  if (!data.bankDetails?.accountNumber?.trim()) errors.push('Bank account number is required');
  if (!data.bankDetails?.bankName?.trim()) errors.push('Bank name is required');
  if (!data.bankDetails?.ifscCode?.trim()) errors.push('IFSC code is required');
  if (!data.bankDetails?.accountHolderName?.trim()) errors.push('Account holder name is required');

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email format');
  if (data.phone && !/^\d{10}$/.test(data.phone)) errors.push('Phone number must be 10 digits');
  if (data.aadhaarNumber && !/^\d{12}$/.test(data.aadhaarNumber)) errors.push('Aadhaar number must be 12 digits');
  if (data.bankDetails?.accountNumber && !/^\d{9,18}$/.test(data.bankDetails.accountNumber)) errors.push('Invalid bank account number');
  if (data.bankDetails?.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.bankDetails.ifscCode)) errors.push('Invalid IFSC code format');

  return errors;
};

// Controller: addformMaid
const addformMaid = async (req, res) => {
  console.log('Received maid application:', req.body);
  console.log('Uploaded file:', req.file);

  try {
    // Validate Cloudinary configuration
    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary configuration is missing. Ensure CLOUDINARY_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env'
      });
    }

    // Log Cloudinary configuration
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('Cloudinary Config:', cloudinary.config());

    // Process specialties
    let specialties = [];
    if (typeof req.body.specialties === 'string') {
      try {
        specialties = JSON.parse(req.body.specialties);
      } catch (e) {
        specialties = req.body.specialties.split(',').map(s => s.trim().replace(/["']/g, ''));
      }
    } else if (Array.isArray(req.body.specialties)) {
      specialties = req.body.specialties;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Specialties must be a valid JSON array or comma-separated string'
      });
    }

    // Normalize experience
    let experience = req.body.experience;
    if (experience && !experience.includes('years')) {
      experience = `${experience} years`;
    }

    // Upload aadhaarPhoto to Cloudinary
    let aadhaarPhotoUrl = null;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar photo is required and must be a valid file'
      });
    }

    const uploadToCloudinary = (buffer) => {
      return new Promise((resolve, reject) => {
        const base64Image = buffer.toString('base64');
        cloudinary.uploader.upload(
          `data:image/png;base64,${base64Image}`,
          { resource_type: 'image', folder: 'maid_aadhaar' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary API Error:', error);
              return reject(error);
            }
            resolve(result.secure_url);
          }
        );
      });
    };

    try {
      aadhaarPhotoUrl = await timeout(uploadToCloudinary(req.file.buffer), 30000); // 30-second timeout
      console.log('Cloudinary upload result:', aadhaarPhotoUrl);
    } catch (uploadError) {
      console.error('Cloudinary upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload Aadhaar photo to Cloudinary',
        error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
      });
    }

    // Parse bank details
    let bankDetails = req.body.bankDetails;
    if (typeof bankDetails === 'string') {
      try {
        bankDetails = JSON.parse(bankDetails);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid bank details format'
        });
      }
    }

    const maidData = {
      userId: req.body.userId,
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      experience: experience,
      specialties: specialties,
      bio: req.body.bio,
      aadhaarNumber: req.body.aadhaarNumber,
      bankDetails: {
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        ifscCode: bankDetails.ifscCode,
        accountHolderName: bankDetails.accountHolderName
      },
      rating: 0,
      aadhaarPhoto: aadhaarPhotoUrl,
      image: aadhaarPhotoUrl
    };

    // Validate data
    const validationErrors = validateInputs(maidData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Check for existing maid
    const existingMaid = await Maid.findOne({
      $or: [
        { email: maidData.email.toLowerCase() },
        { phone: maidData.phone },
        { aadhaarNumber: maidData.aadhaarNumber }
      ]
    });

    if (existingMaid) {
      return res.status(409).json({
        success: false,
        message: 'Maid with this email, phone, or Aadhaar number already exists'
      });
    }

    // Save to database
    const maid = new Maid(maidData);
    const savedMaid = await maid.save();
    console.log('Maid saved:', savedMaid._id);

    res.status(201).json({
      success: true,
      message: 'Maid application submitted successfully',
      data: {
        id: savedMaid._id,
        name: savedMaid.fullName,
        email: savedMaid.email,
        status: savedMaid.status
      }
    });
  } catch (error) {
    console.error('Error submitting maid application:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controller: getformMaids
const getformMaids = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) query.status = status;

    const maids = await Maid.find(query)
      .select('-__v -bankDetails')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const count = await Maid.countDocuments(query);

    return res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / Number(limit)),
      currentPage: Number(page),
      data: maids
    });
  } catch (error) {
    console.error('Error fetching maids:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controller: updateStatusMaid
const updateStatusMaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate input
    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: 'ID and status are required'
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid maid ID format'
      });
    }

    // Update the maid application record
    const updatedMaid = await Maid.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updatedMaid) {
      return res.status(404).json({
        success: false,
        message: 'Maid application not found'
      });
    }

    // If status is 'approved', create a new maid record
    if (status === 'approved') {
      try {
        // Ensure specialties is an array
        const specialties = Array.isArray(updatedMaid.specialties)
          ? updatedMaid.specialties
          : [updatedMaid.specialties || 'General'];

        // Normalize experience
        const experienceValue = updatedMaid.experience
          ? updatedMaid.experience.replace(' years', '')
          : '0-1';

        // Validate userId as ObjectId
        if (!mongoose.Types.ObjectId.isValid(updatedMaid.userId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid userId format: Must be a valid ObjectId'
          });
        }

        // Check if maid already exists
        const existingMaid = await Maid.findOne({
          $or: [
            { email: updatedMaid.email.toLowerCase() },
            { phone: updatedMaid.phone },
            { aadhaarNumber: updatedMaid.aadhaarNumber }
          ],
          _id: { $ne: id } // Exclude the current maid
        });

        if (existingMaid) {
          return res.status(409).json({
            success: false,
            message: 'Maid with this email, phone, or Aadhaar number already exists'
          });
        }

        const newMaid = new Maid({
          userId: updatedMaid.userId,
          fullName: updatedMaid.fullName,
          email: updatedMaid.email,
          phone: updatedMaid.phone,
          experience: experienceValue,
          specialties: specialties,
          bio: updatedMaid.bio,
          aadhaarNumber: updatedMaid.aadhaarNumber,
          aadhaarPhoto: updatedMaid.aadhaarPhoto,
          bankDetails: updatedMaid.bankDetails,
          image: updatedMaid.image || updatedMaid.aadhaarPhoto || 'default.jpg',
          rating: updatedMaid.rating || 0,
          status: 'active',
          createdAt: new Date()
        });

        console.log('New Maid:', newMaid);
        const savedMaid = await newMaid.save();
        console.log('New maid created:', savedMaid._id);

        return res.status(200).json({
          success: true,
          message: 'Maid status updated successfully and new maid record created',
          data: updatedMaid,
          maid: savedMaid
        });
      } catch (saveError) {
        console.error('Error creating Maid:', saveError);
        return res.status(500).json({
          success: false,
          message: 'Error creating Maid: ' + saveError.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Maid status updated successfully',
      data: updatedMaid
    });
  } catch (error) {
    console.error('Error updating maid status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controller: deleteMaid
const deleteMaid = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Maid ID is required'
      });
    }

    const deletedMaid = await Maid.findByIdAndDelete(id);

    if (!deletedMaid) {
      return res.status(404).json({
        success: false,
        message: 'Maid not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Maid deleted successfully',
      data: {
        id: deletedMaid._id,
        name: deletedMaid.fullName,
        email: deletedMaid.email
      }
    });
  } catch (error) {
    console.error('Error deleting maid:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controller: deleteMaids
const deleteMaids = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: 'Array of maid IDs is required'
      });
    }

    const deleteResult = await Maid.deleteMany({ _id: { $in: ids } });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No maids found to delete'
      });
    }

    return res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} maid(s) deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting multiple maids:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  addformMaid,
  getformMaids,
  updateStatusMaid,
  deleteMaid,
  deleteMaids
};