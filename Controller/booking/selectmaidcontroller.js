const Maid = require('../../Models/maid');
const Booking = require('../../Models/booking/selectmaid');
const asyncHandler = require('../../middleware/asyncHandler');
const ErrorResponse = require('../../utils/ErrorResponse');

// @desc    Get available maids
// @route   GET /api/v1/booking/maids
// @access  Public
exports.getAvailableMaids = asyncHandler(async (req, res, next) => {
  try {
    const { cuisine, specialties, minRating, timeSlot } = req.query;
    
    // Build filter object
    const filters = {};
    
    if (cuisine) filters.cuisine = { $in: cuisine.split(',') };
    if (specialties) filters.specialties = { $in: specialties.split(',') };
    if (minRating) filters.rating = { $gte: Number(minRating) };
    
    // Find all maids matching filters
    let maids = await Maid.find(filters);
    
    // If timeSlot is provided, filter for availability
    if (timeSlot) {
      maids = await Promise.all(
        maids.map(async maid => {
          const isAvailable = await Booking.isMaidAvailable(maid._id, timeSlot);
          return isAvailable ? maid : null;
        })
      );
      maids = maids.filter(maid => maid !== null);
    }
    
    res.status(200).json({
      success: true,
      count: maids.length,
      data: maids
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Select a maid
// @route   POST /api/v1/booking/select-maid
// @access  Private
exports.selectMaid = asyncHandler(async (req, res, next) => {
  try {
    const { maidId, memberId, services, timeSlot, notes } = req.body;
    
    // Validate required fields
    if (!maidId || !memberId || !timeSlot) {
      return next(new ErrorResponse('Missing required fields (maidId, memberId, timeSlot)', 400));
    }
    
    // Check maid availability
    const isAvailable = await Booking.isMaidAvailable(maidId, timeSlot);
    if (!isAvailable) {
      return next(new ErrorResponse('Maid is not available for the selected time slot', 400));
    }
    
    // Create booking
    const booking = await Booking.create({
      maid: maidId,
      member: memberId,
      services,
      timeSlot,
      notes,
      status: 'confirmed'
    });
    
    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (err) {
    next(err);
  }
});