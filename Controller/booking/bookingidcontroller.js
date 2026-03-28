const Booking = require('../../Models/booking/bookingmodel');
const User = require('../../Models/Users');
const Maid = require('../../Models/maid');
const payment =require('../../Models/payment/payment')
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


exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'fullName email')
      .populate('maidId', 'fullName specialties rating experience hourlyRate')
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};

exports.getBookingByMaidId = async (req, res) => {
  try {
    console.log('Maid ID:', req.params.id); // Log the maid ID for debugging
    const sortOrder = req.query.sort === 'asc' ? 1 : -1; // Default to descending if not specified
    const bookings = await Booking.find({ maidId: req.params.id })
      .populate('userId', 'fullName email')
      .populate('maidId', 'fullName cooking specialties')
      .sort({ createdAt: sortOrder });

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
      .populate('maidId', 'fullName specialties rating experience hourlyRate')
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this user' });
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

// Update booking status (confirmed or cancelled) and send email
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

              // Upload new file using buffer stream
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'payment_proofs',
                  resource_type: 'image'
                },
                function(error, result) {
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
                }
              );
              uploadStream.end(req.file.buffer);
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

// exports.getBookingByMaidId = async (req, res) => {
//   try {
//     const { maidId } = req.params;
    
//     // If maidId is 'total', return all bookings
//     if (maidId === 'total') {
//       const bookings = await Booking.find();
//       return res.status(200).json({ bookings });
//     }
    
//     // Otherwise, treat it as a normal ObjectId query
//     const bookings = await Booking.find({ maidId });
//     res.status(200).json({ bookings });
//   } catch (error) {
//     console.error('Error fetching bookings:', error);
//     res.status(500).json({ message: 'Error fetching bookings', error: error.message });
//   }
// };

exports.getStats = async (req, res) => {
  try {
    // User statistics by role
    const totalChefs = await User.countDocuments({ role: 'chef' });
    const totalMaids = await User.countDocuments({ role: 'maid' });
    const totalRegularUsers = await User.countDocuments({ role: 'user' }); // or whatever your regular user role is called

    // Booking status statistics
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
    const collectedBookings = await Booking.countDocuments({ status: 'collected' });

    res.status(200).json({
      users: {
        total: totalChefs + totalMaids + totalRegularUsers,
        chefs: totalChefs,
        maids: totalMaids,
        users: totalRegularUsers
      },
      bookings: {
        total: confirmedBookings + cancelledBookings + collectedBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
        collected: collectedBookings
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
};
exports.getBookingsByMaid = async (req, res) => {
    try {
      const { maidId } = req.query;
      if (!maidId || !mongoose.isValidObjectId(maidId)) {
        return res.status(400).json({ error: 'Valid maidId is required' });
      }
      const bookings = await Booking.find(
        { maidId: new mongoose.Types.ObjectId(maidId), status: { $in: ['pending', 'confirmed'] } },
        '_id status totalAmount'
      ).lean();
      res.json({ success: true, bookings });
    } catch (error) {
      console.error('Error fetching bookings:', error.stack);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  };


exports.getBookingsByMaidId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.params);

    // Validate maidId
    if (!id) {
      return res.status(400).json({ 
        success: false,
        message: 'Maid ID is required' 
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Maid ID format'
      });
    }

    // Get all bookings for this maid with status breakdown
    const stats = await Booking.aggregate([
      {
        $match: { maidId: new mongoose.Types.ObjectId(id) }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          confirmed: 1,
          cancelled: 1
        }
      }
    ]);

    // If no bookings found
    if (stats.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          confirmed: 0,
          cancelled: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error('Error fetching maid booking stats:', error);

    // Handle CastError for invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Maid ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching maid bookings',
      error: error.message
    });
  }
};




exports.getTotalEarnings = async (req, res) => {
  try {
    const result = await Booking.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" }
        }
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      totalAmount: result[0]?.totalAmount || 0
    });

  } catch (error) {
    console.error('Error fetching total amount:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching total amount',
      error: error.message
    });
  }
};



exports.getAllMaidEarnings = async (req, res) => {
  try {
    console.log('Query params:', req.query); // Log query parameters for debugging
    const pipeline = [
      // Stage 1: Filter bookings and ensure valid maidId
      {
        $match: {
          maidId: { $exists: true, $ne: null },
          ...(req.query.startDate && { createdAt: { $gte: new Date(req.query.startDate) } }),
          ...(req.query.endDate && { createdAt: { $lte: new Date(req.query.endDate) } })
        }
      },
      // Stage 2: Group by maidId to calculate earnings
      {
        $group: {
          _id: "$maidId",
          totalEarnings: { $sum: "$totalAmount" },
          completedBookings: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0] 
            } 
          },
          totalBookings: { $sum: 1 }
        }
      },
      // Stage 3: Lookup user details from users collection
      {
        $lookup: {
          from: "users", // Join with users collection since maidId references User
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      // Stage 4: Lookup maid details from maids collection using userId
      {
        $lookup: {
          from: "maids",
          localField: "_id",
          foreignField: "userId", // Match maidId (from Booking) to userId in maids
          as: "maidDetails"
        }
      },
      { $unwind: { path: "$maidDetails", preserveNullAndEmptyArrays: true } },
      // Stage 5: Project the final output
      {
        $project: {
          maidId: "$_id",
          maidName: {
            $ifNull: ["$maidDetails.fullName", "$userDetails.name", "Unknown Maid"] // Fallback to user name if maid not found
          },
          profileImage: "$maidDetails.image",
          totalEarnings: { $ifNull: [{ $round: ["$totalEarnings", 2] }, 0] },
          completedBookings: { $ifNull: ["$completedBookings", 0] },
          totalBookings: { $ifNull: ["$totalBookings", 0] },
          _id: 0
        }
      },
      // Stage 6: Sort by highest earnings first
      { $sort: { totalEarnings: -1 } }
    ];

    let result = await Booking.aggregate(pipeline);
    console.log('Aggregation result:', result); // Log raw aggregation output

    // Fallback: Include all maids if no bookings or no matches
    if (result.length === 0 || result.every(item => item.maidName === "Unknown Maid")) {
      console.warn('No bookings or no matching maids found, using fallback');
      const allMaids = await Maid.find({}, 'fullName image _id userId');
      const maidMap = new Map(allMaids.map(maid => [maid.userId.toString(), maid]));
      
      result = allMaids.map(maid => ({
        maidId: maid.userId, // Use userId as maidId to match Booking
        maidName: maid.fullName || 'Unknown Maid',
        profileImage: maid.image,
        totalEarnings: result.find(r => r.maidId?.toString() === maid.userId.toString())?.totalEarnings || 0,
        completedBookings: result.find(r => r.maidId?.toString() === maid.userId.toString())?.completedBookings || 0,
        totalBookings: result.find(r => r.maidId?.toString() === maid.userId.toString())?.totalBookings || 0
      }));
    }

    res.status(200).json({
      success: true,
      count: result.length,
      earnings: result
    });
  } catch (error) {
    console.error('Error fetching maid earnings:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching maid earnings',
      error: error.message
    });
  }
};