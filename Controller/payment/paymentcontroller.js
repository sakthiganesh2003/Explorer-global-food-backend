const Booking = require('../../Models/booking/bookingmodel.js');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const crypto = require('crypto');
const dotenv = require('dotenv');
const User = require('../../Models/Users');
const { Payment, ModeOfPayment } = require('../../Models/payment/payment.js');

dotenv.config();

// Razorpay Configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Constants
const MAX_RETRIES = 3;
const UPLOAD_TIMEOUT_MS = 30000; // Increased to 30 seconds
const RETRY_DELAY_MS = 2000; // 2-second delay between retries

// Retry Utility for Cloudinary Upload with Timeout and Delay
const streamUploadWithRetry = async (fileBuffer, retries = MAX_RETRIES, timeoutMs = UPLOAD_TIMEOUT_MS) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      console.log(`🔁 Cloudinary upload attempt ${attempt + 1} starting...`);
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error(`Cloudinary upload attempt ${attempt + 1} timed out after ${timeoutMs}ms`);
          reject(new Error('Cloudinary upload timeout'));
        }, timeoutMs);
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'manual_payments',
            resource_type: 'image',
          },
          (error, result) => {
            clearTimeout(timeout);
            if (result) {
              console.log(`Cloudinary upload attempt ${attempt + 1} succeeded`);
              resolve(result);
            } else {
              console.error(`Cloudinary upload attempt ${attempt + 1} failed: ${error?.message || 'Unknown error'}`);
              reject(error);
            }
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    } catch (err) {
      attempt++;
      if (attempt === retries) {
        throw new Error(`Cloudinary upload failed after ${retries} attempts: ${err.message}`);
      }
      console.warn(`Waiting ${RETRY_DELAY_MS}ms before retry ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS)); // Delay before retry
    }
  }
};

// Multer Config with File Size Limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Helper Function
const getNextInstallmentNumber = async (bookingId) => {
  const lastPayment = await Payment.findOne({ bookingId })
    .sort({ installmentNumber: -1 })
    .limit(1);
  return lastPayment ? lastPayment.installmentNumber + 1 : 1;
};

// Payment Functions
const initiatePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Missing bookingId",
        requiredFields: ["bookingId"]
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
        errorCode: "BOOKING_NOT_FOUND"
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "Cannot process payment for cancelled booking",
        errorCode: "BOOKING_CANCELLED"
      });
    }

    const amount = booking.totalAmount;
    const receiptId = `bk${bookingId.toString().slice(-12)}${Date.now().toString().slice(-6)}`;

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay accepts the amount in paise (100 paise = 1 INR)
      currency: 'INR',
      receipt: receiptId,
      payment_capture: 1,
      notes: {
        booking: bookingId.toString(),
        type: 'full'
      }
    });

    await Booking.findByIdAndUpdate(bookingId, {
      $set: { razorpayOrderId: order.id }
    });

    // Generate the signature for verification
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.id}|${order.receipt}`)
      .digest('hex');

    res.status(200).json({
      success: true,
      order,
      signature: generatedSignature,  // Return the signature along with order details
      currency: 'INR'
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({
      success: false,
      message: "Payment initiation failed",
      errorCode: "SERVER_ERROR",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, signature, paymentId, bookingId } = req.body;

    if (!orderId || !signature || !paymentId || !bookingId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        errorCode: "MISSING_FIELDS",
        requiredFields: ["orderId", "signature", "paymentId", "bookingId"]
      });
    }

    // Log incoming data
    console.log("Received Payload:", { orderId, paymentId, signature, bookingId });

    // Generate signature
    const data = `${orderId.trim()}|${paymentId.trim()}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(data)
      .digest('hex');

    const receivedSignature = signature.trim().toLowerCase();

    // Log debugging info
    console.log("Signature Generation Data:", data);
    console.log("Order ID:", orderId.trim());
    console.log("Payment ID:", paymentId.trim());
    console.log("Received Signature:", receivedSignature);
    console.log("Generated Signature:", generatedSignature);
    console.log("RAZORPAY_KEY_SECRET (partial):", process.env.RAZORPAY_KEY_SECRET.slice(0, 4) + '...');

    if (generatedSignature !== receivedSignature) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
        errorCode: "INVALID_SIGNATURE",
        debug: {
          orderId: orderId.trim(),
          paymentId: paymentId.trim(),
          receivedSignature,
          generatedSignature,
          dataUsed: data
        }
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
        errorCode: "BOOKING_NOT_FOUND"
      });
    }

    // Fetch payment details from Razorpay
    let razorpayPayment;
    try {
      razorpayPayment = await razorpay.payments.fetch(paymentId);
      console.log("Fetched Razorpay Payment Details:", razorpayPayment);
    } catch (err) {
      await session.abortTransaction();
      console.error("Razorpay Fetch Error:", err);
      return res.status(400).json({
        success: false,
        message: "Invalid or non-existent payment ID",
        errorCode: "RAZORPAY_FETCH_FAILED",
        razorpayError: err.error || err.message
      });
    }

    // Check if the payment is captured
    if (razorpayPayment.status !== 'captured') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${razorpayPayment.status}`,
        errorCode: "PAYMENT_NOT_CAPTURED",
        paymentDetails: razorpayPayment
      });
    }

    // Create mode of payment and payment record
    const modeOfPayment = new ModeOfPayment({
      modeOfPayment: 'razorpay',
      displayName: 'Razorpay',
      bookingId: booking._id,
      details: {
        gateway: 'razorpay',
        orderId,
        paymentId,
        method: razorpayPayment.method,
        bank: razorpayPayment.bank || null,
        wallet: razorpayPayment.wallet || null,
        status: razorpayPayment.status,
        capturedAt: new Date(razorpayPayment.captured_at * 1000)
      }
    });

    const payment = new Payment({
      modeOfPaymentId: modeOfPayment._id,
      bookingId: booking._id,
      amount: booking.totalAmount,
      currency: 'INR',
      paymentStatus: 'completed',
      paymentType: 'full',
      payId: paymentId,
      customerResponse: razorpayPayment,
      isPartial: false,
      completedAt: new Date()
    });

    // Update booking status
    booking.status = 'confirmed';
    booking.razorpayOrderId = undefined;

    // Save transaction data
    await modeOfPayment.save({ session });
    await payment.save({ session });
    await booking.save({ session });

    await session.commitTransaction();
    return res.status(200).json({
      success: true,
      message: "Full payment verified and recorded",
      payment,
      booking
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during payment verification",
      errorCode: "SERVER_ERROR",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Export the functions and upload middleware
module.exports = {
  initiatePayment,
  verifyPayment,
};
