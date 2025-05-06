const Booking = require('../../Models/booking/bookingmodel');
const User = require('../../Models/Users');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;




// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send email
const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"global food explore Booking Service" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup for memory storage (files are not saved locally)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG/PNG images are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single('paymentProof');


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
    console.log('Maid ID:', req.params.id); // Log the maid ID for debugging
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

exports.getBookingByUserId = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.id })
      .populate('userId', 'fullName email')
      .populate('maidId', 'fullName specialties rating experience hourlyRate');

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this user' });
    }

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching booking', error: error.message });
  }
}


  
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

// Update booking status (accept or reject)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting "confirmed" or "cancelled"

    // Validate status
    if (!['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use "confirmed" or "cancelled".' });
    }

    const booking = await Booking.findById(id).populate('userId', 'email');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === 'confirmed' || booking.status === 'cancelled') {
      return res.status(400).json({ message: `Booking is already ${booking.status}` });
    }

    booking.status = status;
    await booking.save();

    // Prepare email details based on status
    const userEmail = booking.userId.email;
    let subject, text;

    if (status === 'confirmed') {
      subject = 'Booking Confirmation';
      text = `Dear User,\n\nYour booking has been confirmed by the maid.\n\nDetails:\n- Date: ${booking.time.date}\n- Time: ${booking.time.time.join(', ')}\n- Address: ${booking.time.address}\n- Total Amount: ${booking.totalAmount}\n\nThank you for using our service!\n\nBest regards,\nBooking Service Team`;
    } else {
      subject = 'Booking Rejected';
      text = `Dear User,\n\nWe regret to inform you that your booking has been rejected by the maid and "2 days your amounts is refund".\n\nDetails:\n- Date: ${booking.time.date}\n- Time: ${booking.time.time.join(', ')}\n- Address: ${booking.time.address}\n\nPlease feel free to book another slot or contact support for assistance.\n\nBest regards,\nBooking Service Team`;
    }

    await sendEmail(userEmail, subject, text);

    res.status(200).json({ message: `Booking ${status} successfully`, booking });
  } catch (error) {
    res.status(500).json({ message: `Error updating booking status`, error: error.message });
  }
};
// // Reject a booking
// exports.rejectBooking = async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }

//     if (booking.status === 'cancelled' || booking.status === 'confirmed') {
//       return res.status(400).json({ message: `Booking is already ${booking.status}` });
//     }

//     booking.status = 'cancelled';
//     await booking.save();

//     res.status(200).json({ message: 'Booking rejected successfully', booking });
//   } catch (error) {
//     res.status(500).json({ message: 'Error rejecting booking', error: error.message });
//   }
// };

// Get rejected (cancelled) bookings
exports.rejectBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'cancelled' })
      .populate('userId', 'fullName email')
      .populate('maidId', 'fullName specialties rating experience hourlyRate');
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cancelled bookings', error: error.message });
  }
};

exports.handleRejection = async (req, res) => {
  try {
    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: 'File upload error', error: err.message });
      }

      const { bookingId, refundAmount, refundReason, paymentStatus, partialAmount } = req.body;

      // Validate inputs
      if (!mongoose.isValidObjectId(bookingId)) {
        return res.status(400).json({ message: 'Invalid booking ID' });
      }
      if (!['paid', 'unpaid', 'partial'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status' });
      }
      if (paymentStatus === 'partial' && (!partialAmount || partialAmount <= 0)) {
        return res.status(400).json({ message: 'Partial amount must be greater than 0' });
      }
      if (refundAmount < 0) {
        return res.status(400).json({ message: 'Refund amount cannot be negative' });
      }

      // Find booking
      const booking = await Booking.findById(bookingId).populate('userId', 'email');
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if already cancelled
      if (booking.status === 'cancelled') {
        return res.status(400).json({ message: 'Booking is already cancelled' });
      }

      // Update booking
      booking.status = 'reject';
      booking.paymentStatus = paymentStatus;
      booking.refundAmount = parseFloat(refundAmount) || 0;
      booking.refundReason = refundReason || '';
      if (paymentStatus === 'partial') {
        booking.partialAmount = parseFloat(partialAmount) || 0;
      }
      if (req.file) {
        booking.paymentProof = `/uploads/${req.file.filename}`; // Store relative path
      }

      await booking.save();

      // Send email notification
      const userEmail = booking.userId.email;
      const subject = 'Booking Cancellation and Refund';
      const text = `Dear User,\n\nYour booking (ID: ${booking._id}) has been cancelled.\n\nDetails:\n- Date: ${booking.time.date}\n- Time: ${booking.time.time.join(', ')}\n- Address: ${booking.time.address}\n- Total Amount: ${booking.totalAmount}\n- Refund Amount: ${booking.refundAmount}\n- Refund Reason: ${booking.refundReason || 'Not specified'}\n- Payment Status: ${booking.paymentStatus}${booking.paymentStatus === 'partial' ? ` (Partial Amount: ${booking.partialAmount})` : ''}\n\nPlease contact support for any questions.\n\nBest regards,\nBooking Service Team`;

      await sendEmail(userEmail, subject, text);

      res.status(200).json({ message: 'Booking cancelled successfully', booking });
    });
  } catch (error) {
    console.error('Error handling booking rejection:', error);
    res.status(500).json({ message: 'Error handling booking rejection', error: error.message });
  }
};
