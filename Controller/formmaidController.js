const Maid = require('../Models/formmaid');
const multer = require('multer'); 
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const express = require('express');
const formmaid = require('../Models/formmaid');
const app = express();
// Multer setup - Use diskStorage to save files and get a path
// Configure Cloudinary
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer setup with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

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
    }

    // Normalize experience
    let experience = req.body.experience;
    if (experience && !experience.includes('years')) {
      experience = `${experience} years`;
    }

    // Upload aadhaarPhoto to Cloudinary if file exists
    let aadhaarPhotoUrl = null;
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: 'maid_aadhaar' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      aadhaarPhotoUrl = result.secure_url;
      console.log('Cloudinary upload result:', aadhaarPhotoUrl);
    }

    // Extract bank details
    const bankDetails = req.body.bankDetails || {};
    const maidData = {
      userId: req.body.userId,
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      experience: experience,
      specialties: specialties,
      bio: req.body.bio,
      aadhaarNumber: req.body.aadhaarNumber,
      aadhaarPhoto: aadhaarPhotoUrl,
      bankDetails: {
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        ifscCode: bankDetails.ifscCode,
        accountHolderName: bankDetails.accountHolderName
      },
      image: aadhaarPhotoUrl, // Use aadhaarPhoto as image (adjust if separate)
      rating: 0 // Default rating
    };

    // Validate data
    const validationErrors = validateInputs(maidData);
    console.log('Validation errors:', validationErrors);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: validationErrors 
      });
    }

     // Adjust path as needed
    const existingMaid = await formmaid.findOne({
      $or: [
        { email: maidData.email.toLowerCase() },
        { phone: maidData.phone },
        { aadhaarNumber: maidData.aadhaarNumber }
      ]
    });
    console.log('Existing maid:', existingMaid ? existingMaid._id : 'None');

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
const getformMaids = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    
    const maids = await Maid.find(query)
      .select('-__v -bankDetails')
      .sort({ createdAt: -1 }) // Changed from registrationDate to createdAt
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

const mongoose = require('mongoose');

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

    // Update the formmaid record
    const updatedFormMaid = await FormMaid.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updatedFormMaid) {
      return res.status(404).json({ 
        success: false,
        message: 'Maid application not found' 
      });
    }

    // If status is 'approved', create a new record in the maid collection
    if (status === 'approved') {
      const maidData = {
        userId: updatedFormMaid.userId,
        fullName: updatedFormMaid.fullName,
        email: updatedFormMaid.email,
        phone: updatedFormMaid.phone,
        experience: updatedFormMaid.experience,
        specialties: updatedFormMaid.specialties,
        bio: updatedFormMaid.bio,
        aadhaarNumber: updatedFormMaid.aadhaarNumber,
        aadhaarPhoto: updatedFormMaid.aadhaarPhoto,
        bankDetails: updatedFormMaid.bankDetails,
        image: updatedFormMaid.image || updatedFormMaid.aadhaarPhoto, // Fallback to aadhaarPhoto
        rating: updatedFormMaid.rating || 0, // Default if not present
        status: 'active', // Initial status for new maid record
        createdAt: new Date()
      };

      // Check if maid already exists in the maid collection
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
          message: 'Approved maid with this email, phone, or Aadhaar number already exists'
        });
      }

      // Create new maid record
      const newMaid = new Maid(maidData);
      const savedMaid = await newMaid.save();
      console.log('New maid created:', savedMaid._id);
    }

    return res.status(200).json({
      success: true,
      message: 'Maid status updated successfully' + (status === 'approved' ? ' and new maid record created' : ''),
      data: updatedFormMaid
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

module.exports = { updateStatusMaid };
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