const Booking = require('../../Models/booking/bookingmodel');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const crypto = require('crypto');
const dotenv = require('dotenv');
const User = require('../../Models/Users');
const { Payment, ModeOfPayment } = require('../../Models/payment/payment.js');
// const streamifier = require('streamifier');

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
const UPLOAD_TIMEOUT_MS = 30000; // 30 seconds
const RETRY_DELAY_MS = 2000; // 2-second delay between retries
const MAX_PAYMENT_RETRIES = 3; // Maximum payment retry attempts

// Retry Utility for Cloudinary Upload
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
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

// Multer Config
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

// Placeholder Notification Function
const sendPaymentNotification = async (userId, payment) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const statusMessages = {
      completed: 'Your payment was successful!',
      failed: 'Your payment failed. Please try again.',
      insufficient_funds: 'Insufficient funds. Please ensure your account has enough balance.',
      declined: 'Your payment was declined by the bank. Please contact your bank.',
      abandoned: 'Your payment was not completed. Please complete the payment.',
      timeout: 'Your payment timed out. Please try again.',
      error: 'An error occurred during payment processing. Please try again.',
    };

    console.log(`Notification to ${user.email}: ${statusMessages[payment.paymentStatus]}`, {
      amount: payment.amount,
      currency: payment.currency,
      paymentId: payment.payId,
      error: payment.errorDetails?.description,
    });
  } catch (error) {
    console.error('Notification Error:', error);
  }
};

// Initiate Payment
const initiatePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Missing userId or amount',
        requiredFields: ['userId', 'amount'],
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid userId format',
        errorCode: 'INVALID_ID',
      });
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    if (amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Amount must be positive',
        errorCode: 'INVALID_AMOUNT',
      });
    }

    const receiptId = `pay_${userId.toString().slice(-12)}${Date.now().toString().slice(-6)}`;

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 1), // Convert to paise
      currency: 'INR',
      receipt: receiptId,
      payment_capture: 1,
      notes: {
        userId: userId.toString(),
        type: 'full',
      },
    });

    const modeOfPayment = new ModeOfPayment({
      modeOfPayment: 'razorpay',
      displayName: 'Razorpay',
      bookingId: null, // No booking yet
      details: {
        gateway: 'razorpay',
        orderId: order.id,
        status: 'pending',
      },
    });

    const payment = new Payment({
      modeOfPaymentId: modeOfPayment._id,
      bookingId: null, // No booking yet
      amount,
      currency: 'INR',
      paymentStatus: 'pending',
      paymentType: 'full',
      payId: order.id, // Use order ID temporarily
      razorpayOrderId: order.id,
      recordedBy: userId,
    });

    await modeOfPayment.save({ session });
    await payment.save({ session });

    await session.commitTransaction();

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.id}|${receiptId}`)
      .digest('hex');

    res.status(200).json({
      success: true,
      order,
      signature: generatedSignature,
      paymentId: payment._id, // Return Payment document ID
      currency: 'INR',
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment initiation failed',
      errorCode: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};

// Verify Payment
const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, signature, paymentId, razorpayPaymentId, userId } = req.body;

    if (!orderId || !signature || !paymentId || !razorpayPaymentId || !userId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errorCode: 'MISSING_FIELDS',
        requiredFields: ['orderId', 'signature', 'paymentId', 'razorpayPaymentId', 'userId'],
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(paymentId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid userId or paymentId format',
        errorCode: 'INVALID_ID',
      });
    }

    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
        errorCode: 'PAYMENT_NOT_FOUND',
      });
    }

    const modeOfPayment = await ModeOfPayment.findById(payment.modeOfPaymentId).session(session);
    if (!modeOfPayment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Mode of payment not found',
        errorCode: 'MODE_OF_PAYMENT_NOT_FOUND',
      });
    }

    const data = `${orderId.trim()}|${razorpayPaymentId.trim()}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(data)
      .digest('hex');

    if (generatedSignature !== signature.trim().toLowerCase()) {
      payment.paymentStatus = 'failed';
      payment.errorDetails = {
        code: 'INVALID_SIGNATURE',
        description: 'Payment signature verification failed',
        source: 'gateway',
        step: 'verification',
      };
      payment.failedAt = new Date();
      modeOfPayment.details.status = 'failed';
      modeOfPayment.details.errorCode = 'INVALID_SIGNATURE';
      modeOfPayment.details.errorDescription = 'Payment signature verification failed';
      await payment.save({ session });
      await modeOfPayment.save({ session });
      await session.commitTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
        errorCode: 'INVALID_SIGNATURE',
        debug: { orderId, razorpayPaymentId, receivedSignature: signature, generatedSignature },
      });
    }

    let razorpayPayment;
    try {
      razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);
      console.log('Razorpay Payment Response:', razorpayPayment); // Debug log
    } catch (err) {
      payment.paymentStatus = 'failed';
      payment.errorDetails = {
        code: err.error?.code || 'FETCH_FAILED',
        description: err.error?.description || 'Failed to fetch payment',
        source: 'gateway',
        step: 'fetch',
      };
      payment.failedAt = new Date();
      modeOfPayment.details.status = 'failed';
      modeOfPayment.details.errorCode = err.error?.code || 'FETCH_FAILED';
      modeOfPayment.details.errorDescription = err.error?.description || 'Failed to fetch payment';
      await payment.save({ session });
      await modeOfPayment.save({ session });
      await session.commitTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID',
        errorCode: 'RAZORPAY_FETCH_FAILED',
        error: err.error || err.message,
      });
    }

    let paymentStatus = 'failed';
    let errorDetails = {};
    let modeDetails = {
      gateway: 'razorpay',
      orderId,
      paymentId: razorpayPaymentId,
      method: razorpayPayment.method,
      bank: razorpayPayment.bank || null,
      wallet: razorpayPayment.wallet || null,
      status: razorpayPayment.status,
    };

    switch (razorpayPayment.status) {
      case 'captured':
        paymentStatus = 'completed';
        // Validate captured_at before setting
        if (razorpayPayment.captured_at && !isNaN(razorpayPayment.captured_at)) {
          modeDetails.capturedAt = new Date(razorpayPayment.captured_at * 1000);
        } else {
          console.warn('Captured_at is invalid or missing:', razorpayPayment.captured_at);
          modeDetails.capturedAt = null; // Set to null if invalid
        }
        break;
      case 'failed':
        paymentStatus = razorpayPayment.error_code?.includes('INSUFFICIENT_FUNDS')
          ? 'insufficient_funds'
          : razorpayPayment.error_code?.includes('DECLINED')
          ? 'declined'
          : 'failed';
        errorDetails = {
          code: razorpayPayment.error_code || 'UNKNOWN',
          description: razorpayPayment.error_description || 'Payment failed',
          source: razorpayPayment.error_source || 'unknown',
          step: razorpayPayment.error_step || 'unknown',
        };
        modeDetails.errorCode = razorpayPayment.error_code;
        modeDetails.errorDescription = razorpayPayment.error_description;
        break;
      case 'created':
      case 'authorized':
        paymentStatus = 'abandoned';
        break;
      default:
        paymentStatus = 'error';
        errorDetails = {
          code: 'UNKNOWN_STATUS',
          description: `Unexpected payment status: ${razorpayPayment.status}`,
          source: 'gateway',
          step: 'verification',
        };
        modeDetails.errorCode = 'UNKNOWN_STATUS';
        modeDetails.errorDescription = `Unexpected payment status: ${razorpayPayment.status}`;
        break;
    }

    payment.paymentStatus = paymentStatus;
    payment.errorDetails = paymentStatus !== 'completed' ? errorDetails : undefined;
    payment.failedAt = paymentStatus !== 'completed' ? new Date() : undefined;
    payment.completedAt = paymentStatus === 'completed' ? new Date() : undefined;
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = signature;
    payment.customerResponse = razorpayPayment;
    payment.payId = razorpayPaymentId; // Update payId to actual payment ID
    payment.retryCount = paymentStatus !== 'completed' ? payment.retryCount + 1 : payment.retryCount;

    modeOfPayment.details = modeDetails;

    await payment.save({ session });
    await modeOfPayment.save({ session });

    await session.commitTransaction();

    await sendPaymentNotification(userId, payment);

    return res.status(paymentStatus === 'completed' ? 200 : 400).json({
      success: paymentStatus === 'completed',
      message: `Payment ${paymentStatus}`,
      payment,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Verify Payment Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during payment verification',
      errorCode: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};

// Retry Payment
const retryPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { paymentId, userId } = req.body;

    if (!paymentId || !userId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        requiredFields: ['paymentId', 'userId'],
      });
    }

    if (!mongoose.Types.ObjectId.isValid(paymentId) || !mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid paymentId or userId format',
        errorCode: 'INVALID_ID',
      });
    }

    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
        errorCode: 'PAYMENT_NOT_FOUND',
      });
    }

    if (payment.retryCount >= MAX_PAYMENT_RETRIES) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Maximum retry attempts exceeded',
        errorCode: 'MAX_RETRIES_EXCEEDED',
      });
    }

    if (!payment.isFailed || !payment.canRetry) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Payment is not eligible for retry',
        errorCode: 'INVALID_RETRY',
      });
    }

    const amount = payment.amount;
    const receiptId = `pay_${userId.toString().slice(-12)}${Date.now().toString().slice(-6)}`;

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 1),
      currency: 'INR',
      receipt: receiptId,
      payment_capture: 1,
      notes: {
        userId: userId.toString(),
        type: 'full',
      },
    });

    payment.razorpayOrderId = order.id;
    payment.paymentStatus = 'pending';
    payment.errorDetails = undefined;
    payment.payId = order.id; // Update payId temporarily
    const modeOfPayment = await ModeOfPayment.findById(payment.modeOfPaymentId).session(session);
    modeOfPayment.details.orderId = order.id;
    modeOfPayment.details.status = 'pending';
    modeOfPayment.details.errorCode = undefined;
    modeOfPayment.details.errorDescription = undefined;

    await payment.save({ session });
    await modeOfPayment.save({ session });

    await session.commitTransaction();

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.id}|${receiptId}`)
      .digest('hex');

    await sendPaymentNotification(userId, payment);

    res.status(200).json({
      success: true,
      order,
      signature: generatedSignature,
      paymentId: payment._id,
      currency: 'INR',
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Retry Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during payment retry',
      errorCode: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    session.endSession();
  }
};

// Get Payment History for a User
const getpaymenthistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Missing userId',
        requiredFields: ['userId'],
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId format',
        errorCode: 'INVALID_ID',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    const bookings = await Booking.find({ userId: id }, { _id: 1 }).lean();
    const bookingIds = bookings.map(b => b._id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const payments = await Payment.find({ bookingId: { $in: bookingIds } })
      .populate('modeOfPaymentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Payment.countDocuments({ bookingId: { $in: bookingIds } });
    const completed = await Payment.countDocuments({
      bookingId: { $in: bookingIds },
      paymentStatus: 'completed',
    });
    const failed = await Payment.countDocuments({
      bookingId: { $in: bookingIds },
      paymentStatus: { $in: ['failed', 'insufficient_funds', 'declined', 'timeout', 'error'] },
    });
    const abandoned = await Payment.countDocuments({
      bookingId: { $in: bookingIds },
      paymentStatus: 'abandoned',
    });

    res.status(200).json({
      success: true,
      message: 'Payment history retrieved successfully',
      payments,
      pagination: {
        page,
        limit,
        total,
      },
      paymentSummary: {
        totalPayments: total,
        completed,
        failed,
        abandoned,
      },
    });
  } catch (error) {
    console.error('Get Payment History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment history',
      errorCode: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get All Payment History
const getAllPaymentHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errorCode: 'INVALID_PAGINATION',
      });
    }

    const payments = await Payment.find()
      .populate('modeOfPaymentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Payment.countDocuments();
    const completed = await Payment.countDocuments({ paymentStatus: 'completed' });
    const failed = await Payment.countDocuments({
      paymentStatus: { $in: ['failed', 'insufficient_funds', 'declined', 'timeout', 'error'] },
    });
    const abandoned = await Payment.countDocuments({ paymentStatus: 'abandoned' });

    res.status(200).json({
      success: true,
      message: payments.length ? 'Payment history retrieved successfully' : 'No payments found',
      payments,
      pagination: {
        page,
        limit,
        total,
      },
      paymentSummary: {
        totalPayments: total,
        completed,
        failed,
        abandoned,
      },
    });
  } catch (error) {
    console.error('Get All Payment History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment history',
      errorCode: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Export Functions and Middleware
module.exports = {
  initiatePayment,
  verifyPayment,
  retryPayment,
  getpaymenthistory,
  getAllPaymentHistory,
  upload,
};