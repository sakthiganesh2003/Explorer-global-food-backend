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

// Handle reservation rejection
exports.handleRejection = function(upload) {
  return function(req, res) {
    upload.single('paymentProof')(req, res, function(err) {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({ message: 'File upload error', error: err.message });
      }

      try {
        var bookingId = req.body.bookingId;
        var refundAmount = req.body.refundAmount;
        var refundReason = req.body.refundReason;
        var paymentStatus = req.body.paymentStatus;

        // Validate inputs
        if (!mongoose.isValidObjectId(bookingId)) {
          return res.status(400).json({ message: 'Invalid reservation ID' });
        }
        if (!['paid', 'unpaid'].includes(paymentStatus)) {
          return res.status(400).json({ message: 'Invalid payment status' });
        }
        if (refundAmount && parseFloat(refundAmount) < 0) {
          return res.status(400).json({ message: 'Refund amount cannot be negative' });
        }

        // Find reservation
        Reservation.findById(bookingId).populate('userId', 'email').exec(function(err, reservation) {
          if (err) {
            console.error('Error finding reservation:', err);
            return res.status(500).json({ message: 'Error finding reservation', error: err.message });
          }
          if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
          }

          // Check if already cancelled
          if (reservation.status === 'cancelled') {
            return res.status(400).json({ message: 'Reservation is already cancelled' });
          }

          // Handle Cloudinary upload if file exists
          var paymentProof = reservation.paymentProof || '';
          if (req.file) {
            try {
              // Delete existing payment proof from Cloudinary if it exists
              if (reservation.paymentProof) {
                var publicId = reservation.paymentProof.split('/').pop().split('.')[0];
                cloudinary.uploader.destroy('payment_proofs/' + publicId, function(error) {
                  if (error) {
                    console.error('Error deleting old payment proof from Cloudinary:', error);
                  }
                });
              }

              // Upload new file
              cloudinary.uploader.upload(req.file.path, {
                folder: 'payment_proofs',
                resource_type: 'image'
              }, function(error, result) {
                if (error) {
                  console.error('Cloudinary upload error:', error);
                  return res.status(400).json({
                    message: 'Failed to upload proof image to Cloudinary',
                    error: error.message
                  });
                }
                paymentProof = result.secure_url;

                // Update reservation
                reservation.status = 'cancelled';
                reservation.paymentStatus = paymentStatus;
                reservation.refundedAmount = parseFloat(refundAmount) || 0;
                reservation.refundedReason = refundReason || '';
                if (paymentProof) {
                  reservation.paymentProof = paymentProof;
                }

                // Save reservation
                reservation.save(function(err) {
                  if (err) {
                    console.error('Error saving reservation:', err);
                    return res.status(500).json({ message: 'Error saving reservation', error: err.message });
                  }

                  // Send email notification
                  var userEmail = reservation.userId.email;
                  var subject = 'Reservation Cancellation and Refund';
                  var text = 'Dear User,\n\nYour reservation (ID: ' + reservation._id + ') has been cancelled.\n\nDetails:\n- Date: ' + reservation.time.date + '\n- Time: ' + reservation.time.time.join(', ') + '\n- Address: ' + reservation.time.address + '\n- Total Amount: ' + reservation.totalAmount + '\n- Refund Amount: ' + reservation.refundedAmount + '\n- Refund Reason: ' + (reservation.refundedReason || 'Not specified') + '\n- Payment Status: ' + reservation.paymentStatus + '\n\nPlease contact support for any questions.\n\nBest regards,\nReservation Service Team';

                  sendEmail(userEmail, subject, text, function(err) {
                    if (err) {
                      console.error('Error sending email:', err);
                    }
                    res.status(200).json({ message: 'Reservation cancelled successfully', reservation: reservation });
                  });
                });
              });
            } catch (cloudinaryError) {
              console.error('Cloudinary upload error:', cloudinaryError);
              return res.status(400).json({
                message: 'Failed to upload proof image to Cloudinary',
                error: cloudinaryError.message
              });
            }
          } else {
            // Update reservation without file upload
            reservation.status = 'cancelled';
            reservation.paymentStatus = paymentStatus;
            reservation.refundedAmount = parseFloat(refundAmount) || 0;
            reservation.refundedReason = refundReason || '';
            if (paymentProof) {
              reservation.paymentProof = paymentProof;
            }

            // Save reservation
            reservation.save(function(err) {
              if (err) {
                console.error('Error saving reservation:', err);
                return res.status(500).json({ message: 'Error saving reservation', error: err.message });
              }

              // Send email notification
              var userEmail = reservation.userId.email;
              var subject = 'Reservation Cancellation and Refund';
              var text = 'Dear User,\n\nYour reservation (ID: ' + reservation._id + ') has been cancelled.\n\nDetails:\n- Date: ' + reservation.time.date + '\n- Time: ' + reservation.time.time.join(', ') + '\n- Address: ' + reservation.time.address + '\n- Total Amount: ' + reservation.totalAmount + '\n- Refund Amount: ' + reservation.refundedAmount + '\n- Refund Reason: ' + (reservation.refundedReason || 'Not specified') + '\n- Payment Status: ' + reservation.paymentStatus + '\n\nPlease contact support for any questions.\n\nBest regards,\nReservation Service Team';

              sendEmail(userEmail, subject, text, function(err) {
                if (err) {
                  console.error('Error sending email:', err);
                }
                res.status(200).json({ message: 'Reservation cancelled successfully', reservation: reservation });
              });
            });
          }
        });
      } catch (error) {
        console.error('Error handling reservation rejection:', error);
        res.status(500).json({ message: 'Error handling reservation rejection', error: error.message });
      }
    });
  };
};

exports.getPaymentDetailsByBookingId = async (req, res) => { 
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId).select('paymentMode');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({ 
      message: 'Payment details retrieved successfully', 
      paymentMode: booking.paymentMode 
    });
  } catch (error) {
    console.error('Error retrieving payment details:', error);
    res.status(500).json({ message: 'Error retrieving payment details', error: error.message });
  }
};

exports.getTotalBookings = async (req, res) => {
 try {
    const totalBookings = await Booking.countDocuments();
    res.status(200).json({ totalBookings });
  } catch (error) {
    console.error('Error fetching total bookings:', error);
    res.status(500).json({ message: 'Error fetching total bookings', error: error.message });
  }
};