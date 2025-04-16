// controllers/bookingController.js
const Booking = require('../../Models/booking/bookingmodel'); // Adjust path to your model file
const Maid = require('../../Models/maid');
const User = require('../../Models/Users'); // Adjust path to your user model file
// Create a new booking
exports.createBooking = async (req, res) => {
  console.log('Booking request body:', req.body);
  try {
    // Validate required fields
    if (!req.body.userId || !req.body.maid || !req.body.time || !req.body.time.date || !req.body.time.time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, maid, or time details'
      });
    }

    // Validate date format and ensure it's not in the past
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const requestedDate = req.body.time.date;
    if (!dateRegex.test(requestedDate) || new Date(requestedDate) < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or past date'
      });
    }

    // Validate that userId and maid exist
    const [user, maid] = await Promise.all([
      User.findById(req.body.userId),
      User.findById(req.body.maid)
    ]);

    if (!user || !maid) {
      return res.status(404).json({
        success: false,
        message: !user ? 'User not found' : 'Maid not found'
      });
    }

    // Extract and normalize time slots
    let requestedTimes = req.body.time.time;
    if (typeof requestedTimes === 'string') {
      requestedTimes = [requestedTimes];
    }

    if (!Array.isArray(requestedTimes)) {
      return res.status(400).json({
        success: false,
        message: 'Time should be an array of time slots'
      });
    }

    // Validate time format
    const timeRegex = /^(\d{1,2}:\d{2}\s?[AP]M)(-\d{1,2}:\d{2}\s?[AP]M)?$/i;
    if (!requestedTimes.every(time => timeRegex.test(time))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use "HH:MM AM/PM" or "HH:MM AM/PM-HH:MM AM/PM"'
      });
    }

    // Parse requested time slots
    const timeSlots = requestedTimes.map(timeSlot => {
      if (!timeSlot.includes('-')) {
        const startTime = convertTo24HourFormat(timeSlot);
        const start = new Date(`${requestedDate}T${startTime}:00`);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // Add 1 hour
        return { start, end };
      }
      const [startTime, endTime] = timeSlot.split('-').map(t => t.trim());
      return {
        start: new Date(`${requestedDate}T${convertTo24HourFormat(startTime)}:00`),
        end: new Date(`${requestedDate}T${convertTo24HourFormat(endTime)}:00`)
      };
    });

    // Check for existing bookings
    const existingBookings = await Booking.find({
      maid: req.body.maid,
      'time.date': requestedDate,
      status: { $ne: 'cancelled' }
    });
    console.log('Existing bookings:', existingBookings);

    // Check for time conflicts
    const hasConflict = existingBookings.some(existingBooking => {
      const existingTimes = Array.isArray(existingBooking.time.time) 
        ? existingBooking.time.time 
        : [existingBooking.time.time];
      
      return existingTimes.some(existingTime => {
        const [existingStart, existingEnd] = existingTime.includes('-')
          ? existingTime.split('-').map(t => 
              new Date(`${existingBooking.time.date}T${convertTo24HourFormat(t.trim())}:00`))
          : [
              new Date(`${existingBooking.time.date}T${convertTo24HourFormat(existingTime)}:00`),
              new Date(new Date(`${existingBooking.time.date}T${convertTo24HourFormat(existingTime)}:00`).getTime() + 60 * 60 * 1000)
            ];
        
        const conflict = timeSlots.some(requestedSlot => {
          const overlap = isTimeOverlap(
            requestedSlot.start, requestedSlot.end,
            existingStart, existingEnd
          );
          console.log(`Checking conflict: Requested [${requestedSlot.start.toISOString()} - ${requestedSlot.end.toISOString()}] vs Existing [${existingStart.toISOString()} - ${existingEnd.toISOString()}] -> Overlap: ${overlap}`);
          return overlap;
        });
        return conflict;
      });
    });

    if (hasConflict) {
      return res.status(400).json({
        success: false,
        message: 'Maid is already booked during the requested time slot(s)'
      });
    }

    // Create the new booking
    const bookingData = {
      ...req.body,
      status: 'pending',
      totalAmount: calculateTotalAmount({ ...req.body, maid })
    };

    const newBooking = new Booking(bookingData);
    const savedBooking = await newBooking.save();

    // Populate the response
    const populatedBooking = await Booking.findById(savedBooking._id)
      .populate('userId', 'name email')
      .populate('maid', 'name email');

    res.status(201).json(
  {
      success: true,
      data: populatedBooking,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error creating booking'
    });
  }
};

// Helper functions
function convertTo24HourFormat(timeStr) {
  const [time, period] = timeStr.split(/(?=[AP]M)/i);
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period?.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (period?.toUpperCase() === 'AM' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function isTimeOverlap(start1, end1, start2, end2) {
  return start1 <= end2 && end1 >= start2;
}

function calculateTotalAmount(bookingData) {
  let total = 0;
  
  if (bookingData.maid?.hourlyRate && bookingData.time?.time) {
    const timeSlots = Array.isArray(bookingData.time.time) ? bookingData.time.time : [bookingData.time.time];
    let totalHours = 0;
    timeSlots.forEach(slot => {
      if (slot.includes('-')) {
        const [start, end] = slot.split('-').map(t => convertTo24HourFormat(t.trim()));
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        totalHours += (endTime - startTime) / (60 * 60 * 1000);
      } else {
        totalHours += 1; // Assume 1 hour for single-point times
      }
    });
    total += bookingData.maid.hourlyRate * totalHours;
  }
  
  if (bookingData.cuisine?.price) {
    total += bookingData.cuisine.price;
  }
  
  if (bookingData.confirmedFoods?.length) {
    total += bookingData.confirmedFoods.reduce(
      (sum, food) => sum + (food.price * food.quantity), 0
    );
  }
  
  return total;
}
// Get all bookings new
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