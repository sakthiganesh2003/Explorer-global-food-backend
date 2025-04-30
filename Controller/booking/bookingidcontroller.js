const Booking = require('../../Models/booking/bookingmodel');
const mongoose = require('mongoose');

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'fullName email')
      .populate('maidId', 'fullName specialties rating experience hourlyRate');
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};

exports.getBookingByMaidId = async (req, res) => {
  try {
    const bookings = await Booking.find({ maidId: req.params.id })
      .populate('userId', 'fullName email')
      .populate('maidId', 'fullName cooking specialties ');

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this maid' });
    }

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching booking', error: error.message });
  }
};


  
// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      userId: mongoose.Types.ObjectId(req.body.userId),
      maidId: mongoose.Types.ObjectId(req.body.maidId),
    };
    const booking = new Booking(bookingData);
    await booking.save();
    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (error) {
    res.status(400).json({ message: 'Error creating booking', error: error.message });
  }
};

// Update a booking
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json({ message: 'Booking updated successfully', booking });
  } catch (error) {
    res.status(400).json({ message: 'Error updating booking', error: error.message });
  }
};

// Delete a booking
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting booking', error: error.message });
  }
};

// Accept a booking
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed' },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json({ message: 'Booking accepted successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting booking', error: error.message });
  }
};

// Reject a booking
exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json({ message: 'Booking rejected successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting booking', error: error.message });
  }
};