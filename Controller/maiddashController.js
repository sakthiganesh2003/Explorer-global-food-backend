const mongoose = require('mongoose');
const Maid = require('../Models/maid');
const Location = require('../Models/Location');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const getMaidProfile = async (req, res) => {
  try {
    const userId = req.params.userId; // Use JWT user ID
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user ID found in request',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        receivedId: userId,
        expectedFormat: '24-character hexadecimal string',
      });
    }

    const objectId = new mongoose.Types.ObjectId(userId);
    const maid = await Maid.findOne({ userId: objectId }).populate('location', 'cityName pincode');

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
        image: maid.image || '/maid-default.jpg', // Updated default
        isActive: maid.active,
        description: maid.description || 'Professional maid',
        servicesLocation: maid.location?.cityName || '', // Map cityName to servicesLocation
        pincode: maid.location?.pincode || '',
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
    console.log(req.params)
    const userId = req.params.id; // Use JWT user ID
    console.log(userId)
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user found in request',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Validate required fields
    const { fullName, specialties, rating, experience, description, servicesLocation, pincode } = req.body;
    if (!fullName || !specialties || !rating || !experience || !servicesLocation || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fullName, specialties, rating, experience, servicesLocation, pincode',
      });
    }

    // Sanitize inputs
    const sanitizeHtml = require('sanitize-html');
    const sanitizedFullName = sanitizeHtml(fullName);
    const sanitizedDescription = sanitizeHtml(description || 'Professional maid');

    // Validate specialties
    if (typeof specialties !== 'string' || specialties.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Specialties must be a non-empty string',
      });
    }
    const specialtiesArray = specialties.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (specialtiesArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid specialty is required',
      });
    }

    // Validate rating
    const parsedRating = parseFloat(rating);
    if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a number between 0 and 5',
      });
    }

    // Validate pincode (6-digit for India)
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Pincode must be a 6-digit number',
      });
    }

    // Handle location: find or create
    let locationDoc = await Location.findOne({ cityName: servicesLocation.trim(), pincode });
    if (!locationDoc) {
      locationDoc = await Location.create({ cityName: servicesLocation.trim(), pincode });
    }

    // Handle image upload to Cloudinary
    let imageUrl = req.body.image || '/maid-default.jpg';
    if (req.file) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET },
          (error, result) => {
            if (error) return reject(new Error(error.message));
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    // Update or create profile
    const updatedMaid = await Maid.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          fullName: sanitizedFullName,
          specialties: specialtiesArray,
          rating: parsedRating,
          experience,
          image: imageUrl,
          active: true,
          description: sanitizedDescription,
          location: locationDoc._id,
        },
      },
      { new: true, runValidators: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      data: {
        id: updatedMaid._id.toString(),
        userId: updatedMaid.userId.toString(),
        fullName: updatedMaid.fullName,
        specialties: updatedMaid.specialties,
        rating: updatedMaid.rating,
        experience: updatedMaid.experience,
        image: updatedMaid.image,
        isActive: updatedMaid.active,
        description: updatedMaid.description,
        servicesLocation: locationDoc.cityName,
        pincode: locationDoc.pincode,
      },
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
  updateMaidProfile: [upload.single('image'), updateMaidProfile],
  toggleActiveStatus,
};