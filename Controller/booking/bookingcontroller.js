// controllers/bookingController.js
const Booking = require('../../Models/booking/bookingmodel'); // Adjust path to your model file
const User = require('../../Models/Users'); // Adjust path to your user model file
// Create a new booking
exports.createBooking = async (req, res) => {
    try {
        // Validate that userId and maid exist
        const user = await User.findById(req.body.userId);
        const maid = await User.findById(req.body.maid);
        
        

        // Extract date and time from the request
        const requestedDate = req.body.time.date;
        const [requestedStartTime, requestedEndTime] = req.body.time.time;

        // Convert to Date objects for comparison
        const requestedStart = new Date(`${requestedDate}T${requestedStartTime}:00`);
        const requestedEnd = new Date(`${requestedDate}T${requestedEndTime}:00`);

        // Check for existing bookings for the maid during the requested time slot
        const existingBookings = await Booking.find({
            maid: req.body.maid,
            'time.date': requestedDate
        });

        // Check for time overlap with existing bookings
        const hasConflict = existingBookings.some(existingBooking => {
            const [existingStartTime, existingEndTime] = existingBooking.time.time;
            const existingStart = new Date(`${existingBooking.time.date}T${existingStartTime}:00`);
            const existingEnd = new Date(`${existingBooking.time.date}T${existingEndTime}:00`);

            // Check if time ranges overlap
            return (
                (requestedStart >= existingStart && requestedStart < existingEnd) ||
                (requestedEnd > existingStart && requestedEnd <= existingEnd) ||
                (requestedStart <= existingStart && requestedEnd >= existingEnd)
            );
        });

        if (hasConflict) {
            return res.status(400).json({
                success: false,
                message: 'Maid is already booked during this time slot',
            });
        }

        const newBooking = new Booking(req.body);
        const savedBooking = await newBooking.save();

        // Populate userId and maid for the response
        const populatedBooking = await Booking.findById(savedBooking._id)
            .populate('userId', 'name email')
            .populate('maid', 'name email');

        res.status(200).json({
            success: true,
            data: populatedBooking,
            message: 'Booking created successfully',
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
            message: 'Error creating booking',
        });
    }
};
// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('maid') // Populates the maid reference
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error fetching bookings'
    });
  }
};

// Get single booking by ID
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('maid');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error fetching booking'
    });
  }
};

// Update booking
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return the updated document
        runValidators: true // Validate the update against schema
      }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Error updating booking'
    });
  }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error deleting booking'
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      message: 'Error updating booking status'
    });
  }
};