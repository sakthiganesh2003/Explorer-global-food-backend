const { ModeOfPayment, Payment, Refund } = require('../../Models/payment/payment.js');
const Booking = require('../../Models/booking/bookingmodel.js');
const razorpayInstance = require('../../Config/razorpay.js');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

// Allowed values for validation
const allowedMethods = ['razorpay', 'cash', 'card'];
const supportedCurrencies = ['INR', 'USD'];
const allowedPaymentTypes = ['full', 'partial'];

// Create Payment Method
const createPaymentMethod = async (req, res) => {
  try {
    const { bookingId, modeOfPayment, details } = req.body;

    // Validate inputs
    if (!bookingId || !modeOfPayment) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and payment method are required',
      });
    }

    if (!allowedMethods.includes(modeOfPayment.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${allowedMethods.join(', ')}`,
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check for existing payment method
    let paymentMethod = await ModeOfPayment.findOne({ bookingId, modeOfPayment: modeOfPayment.toLowerCase() });
    if (paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method already exists for this booking',
      });
    }

    // Create payment method
    paymentMethod = await ModeOfPayment.create({
      modeOfPayment: modeOfPayment.toLowerCase(),
      bookingId,
      details,
      displayName: modeOfPayment.charAt(0).toUpperCase() + modeOfPayment.slice(1).toLowerCase(),
    });

    res.status(201).json({
      success: true,
      paymentMethod,
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment method',
      error: error.message,
    });
  }
};

// Create Razorpay Order
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', bookingId, paymentType = 'full', installmentNumber = 0 } = req.body;

    console.log('createRazorpayOrder req.body:', JSON.stringify(req.body, null, 2)); // Debug log

    // Validate inputs
    if (!amount || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    if (amount.toString().split('.')[1]?.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'Amount cannot have  have more than 2 decimal places',
      });
    }

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
    }

    // Validate bookingId as a valid ObjectId
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Booking ID format. Must be a valid 24-character hexadecimal ObjectId',
      });
    }

    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Currency must be one of: ${supportedCurrencies.join(', ')}`,
      });
    }

    if (!allowedPaymentTypes.includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: `Payment type must be one of: ${allowedPaymentTypes.join(', ')}`,
      });
    }

    console.log('Validating bookingId:', bookingId); // Debug log
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check for existing pending payment for this booking and payment type
    const existingPendingPayment = await Payment.findOne({
      bookingId,
      paymentStatus: 'pending',
      paymentType,
    });
    if (existingPendingPayment) {
      return res.status(400).json({
        success: false,
        message: 'A pending payment already exists for this booking and payment type',
      });
    }

    // Check or create payment method
    let paymentMethod = await ModeOfPayment.findOne({
      bookingId,
      modeOfPayment: 'razorpay',
    });

    if (!paymentMethod) {
      paymentMethod = await ModeOfPayment.create({
        modeOfPayment: 'razorpay',
        bookingId,
        displayName: 'Razorpay',
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: `receipt_${uuidv4().slice(0, 32)}`,
      notes: {
        bookingId: booking._id.toString(),
        paymentType,
        installmentNumber,
      },
    };

    const order = await razorpayInstance.orders.create(options);
    console.log('Created Razorpay order:', order); // Debug log

    // Create payment record
    const payment = await Payment.create({
      modeOfPaymentId: paymentMethod._id,
      bookingId: booking._id,
      amount,
      currency,
      paymentStatus: 'pending',
      paymentType,
      Id: `pay_${uuidv4().slice(0, 32)}`,
      installmentNumber,
      razorpayOrderId: order.id,
      transactionDetails: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
    });
    console.log('Created payment record:', payment); // Debug log

    res.status(201).json({
      success: true,
      order,
      payment,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay order',
      error: error.message,
    });
  }
};

const verifyPaymentStatusWithRazorpay = async (paymentId, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const payment = await razorpayInstance.payments.fetch(paymentId);
      console.log('Razorpay Payment Status:', payment.status, 'Payment ID:', paymentId);
      return payment.status === 'captured' || payment.status === 'authorized';
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, {
        message: error.message || error.error?.description || 'Unknown error',
        status: error.status || error.error?.code || 'Unknown status',
        errorDetails: error.error?.description || 'No additional details',
        paymentId,
      });
      if (error.error?.description === 'The id provided does not exist') {
        throw new Error('Payment ID does not exist in Razorpay');
      }
      if (i === retries - 1) {
        throw new Error('Failed to verify payment with Razorpay after retries');
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const capturePayment = async (paymentId, amount) => {
  try {
    const response = await razorpayInstance.payments.capture(paymentId, amount * 100, 'INR');
    console.log('Payment Captured:', response);
    return response.status === 'captured';
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw new Error('Failed to capture payment');
  }
};

const verifyPayment = async (req, res) => {
  try {
    console.log('Request Headers:', req.headers);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Environment:', process.env.NODE_ENV, 'Razorpay Mode:', process.env.RAZORPAY_KEY_ID.startsWith('rzp_test') ? 'Test' : 'Live');
    console.log('Razorpay Key ID:', process.env.RAZORPAY_KEY_ID);

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Validate input
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.error('Missing required fields:', { razorpay_payment_id, razorpay_order_id, razorpay_signature });
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields',
      });
    }

    if (!razorpay_payment_id.match(/^pay_[A-Za-z0-9-]{20,35}$/)) {
      console.error('Invalid razorpay_payment_id:', razorpay_payment_id);
      return res.status(400).json({
        success: false,
        message: 'Invalid razorpay_payment_id format. Must start with "pay_" and contain 20-35 alphanumeric characters or hyphens',
      });
    }

    if (!/^[0-9a-f]{64}$/i.test(razorpay_signature)) {
      console.error('Invalid razorpay_signature:', razorpay_signature);
      return res.status(400).json({
        success: false,
        message: 'Invalid razorpay_signature format. Must be a 64-character hex string',
      });
    }

    // Check payment existence and status
    console.log('Searching for payment with razorpayOrderId:', razorpay_order_id);
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    console.log('Found payment:', payment);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    // Verify with Razorpay even if marked as completed
    if (payment.paymentStatus === 'completed') {
      const isValid = await verifyPaymentStatusWithRazorpay(payment.razorpayPaymentId);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Payment marked as completed but not valid on Razorpay',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        payment: {
          id: payment._id,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          paymentStatus: payment.paymentStatus,
          amount: payment.amount,
          currency: payment.currency,
          bookingId: payment.bookingId,
          completedAt: payment.completedAt,
        },
      });
    }

    // Check RAZORPAY_KEY_SECRET
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: RAZORPAY_KEY_SECRET is not set',
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    console.log('Generated Signature:', generatedSignature);
    console.log('Provided Signature:', razorpay_signature);

    if (generatedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { paymentStatus: 'failed' },
        { new: true }
      );
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // Verify payment status with Razorpay
    try {
      const isPaymentValid = await verifyPaymentStatusWithRazorpay(razorpay_payment_id);
      if (!isPaymentValid) {
        await Payment.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          { paymentStatus: 'failed' },
          { new: true }
        );
        return res.status(400).json({
          success: false,
          message: 'Payment not captured or authorized on Razorpay',
        });
      }
    } catch (error) {
      if (error.message === 'Payment ID does not exist in Razorpay') {
        console.error('Payment ID not found:', { razorpay_payment_id, razorpay_order_id });
        await Payment.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          { paymentStatus: 'failed' },
          { new: true }
        );
        return res.status(400).json({
          success: false,
          message: 'Payment ID does not exist in Razorpay',
        });
      }
      throw error;
    }

    // Capture payment if authorized
    const razorpayPayment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    if (razorpayPayment.status === 'authorized') {
      await capturePayment(razorpay_payment_id, payment.amount);
    }

    // Start MongoDB transaction
    const session = await Payment.startSession();
    try {
      await session.withTransaction(async () => {
        // Update payment record
        const updatedPayment = await Payment.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paymentStatus: 'completed',
            completedAt: new Date(),
            payId: razorpay_payment_id,
          },
          { new: true, session }
        );

        // Update booking status conditionally
        const booking = await Booking.findById(updatedPayment.bookingId).session(session);
        if (!booking) {
          throw new Error('Booking record not found');
        }

        if (updatedPayment.paymentType === 'full') {
          booking.paymentStatus = 'completed';
        } else if (updatedPayment.paymentType === 'partial') {
          const totalPaid = await Payment.aggregate([
            { $match: { bookingId: updatedPayment.bookingId, paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]);
          if (totalPaid[0]?.total >= booking.totalAmount) {
            booking.paymentStatus = 'completed';
          } else {
            booking.paymentStatus = 'partially_paid';
          }
        }

        await booking.save({ session });
      });

      // Fetch updated payment for response
      const finalPayment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

      res.json({
        success: true,
        payment: {
          id: finalPayment._id,
          razorpayOrderId: finalPayment.razorpayOrderId,
          razorpayPaymentId: finalPayment.razorpayPaymentId,
          paymentStatus: finalPayment.paymentStatus,
          amount: finalPayment.amount,
          currency: finalPayment.currency,
          bookingId: finalPayment.bookingId,
          completedAt: finalPayment.completedAt,
        },
      });
    } catch (error) {
      console.error('Payment Verification Error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
};
// Record Manual Payment
const recordManualPayment = async (req, res) => {
  try {
    const { bookingId, modeOfPayment, amount, paymentType = 'full', recordedBy, notes } = req.body;

    // Validate inputs
    if (!bookingId || !modeOfPayment || !amount || !recordedBy) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, payment method, amount, and recordedBy are required',
      });
    }

    if (!allowedMethods.includes(modeOfPayment.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${allowedMethods.join(', ')}`,
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    if (amount.toString().split('.')[1]?.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'Amount cannot have more than 2 decimal places',
      });
    }

    if (!allowedPaymentTypes.includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: `Payment type must be one of: ${allowedPaymentTypes.join(', ')}`,
      });
    }

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Booking ID format. Must be a valid 24-character hexadecimal ObjectId',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Find or create payment method
    let paymentMethod = await ModeOfPayment.findOne({
      bookingId,
      modeOfPayment: modeOfPayment.toLowerCase(),
    });

    if (!paymentMethod) {
      paymentMethod = await ModeOfPayment.create({
        modeOfPayment: modeOfPayment.toLowerCase(),
        bookingId,
        displayName: modeOfPayment.charAt(0).toUpperCase() + modeOfPayment.slice(1).toLowerCase(),
      });
    }

    // Start MongoDB transaction
    const session = await Payment.startSession();
    try {
      await session.withTransaction(async () => {
        // Check for existing pending payment for this booking and payment type
        const existingPendingPayment = await Payment.findOne({
          bookingId,
          paymentStatus: 'pending',
          paymentType,
        });
        if (existingPendingPayment) {
          return res.status(400).json({
            success: false,
            message: 'A pending payment already exists for this booking and payment type',
          });
        }

        // Create payment record
        const payment = await Payment.create(
          [
            {
              modeOfPaymentId: paymentMethod._id,
              bookingId,
              amount,
              currency: 'INR', // Default for manual payments
              paymentStatus: 'completed',
              paymentType,
              payId: `manual_${uuidv4().slice(0, 32)}`,
              recordedBy,
              completedAt: new Date(),
              notes,
            },
          ],
          { session }
        );

        // Update booking status
        if (paymentType === 'full') {
          booking.paymentStatus = 'completed';
        } else if (paymentType === 'partial') {
          const totalPaid = await Payment.aggregate([
            { $match: { bookingId: booking._id, paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]);
          if (totalPaid[0]?.total >= booking.totalAmount) {
            booking.paymentStatus = 'completed';
          } else {
            booking.paymentStatus = 'partially_paid';
          }
        }

        await booking.save({ session });
      });

      // Fetch created payment
      const createdPayment = await Payment.findOne({
        bookingId,
        payId: payment[0].payId,
      });

      res.status(201).json({
        success: true,
        payment: createdPayment,
      });
    } catch (error) {
      console.error('Transaction Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record manual payment',
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error recording manual payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record manual payment',
      error: error.message,
    });
  }
};

// Process Refund
const processRefund = async (req, res) => {
  try {
    const { paymentId, amountRefunded, refundReason, processedBy } = req.body;

    // Validate inputs
    if (!paymentId || !amountRefunded || !processedBy) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID, amountRefunded, and processedBy are required',
      });
    }

    if (!Number.isFinite(amountRefunded) || amountRefunded <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount must be a positive number',
      });
    }

    if (amountRefunded.toString().split('.')[1]?.length > 2) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot have more than 2 decimal places',
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment already refunded',
      });
    }

    if (payment.amount < amountRefunded) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed payment amount',
      });
    }

    // Start MongoDB transaction
    const session = await Payment.startSession();
    try {
      await session.withTransaction(async () => {
        // Create refund record
        const refund = await Refund.create(
          [
            {
              paymentId,
              amountRefunded,
              status: 'pending',
              refundReason,
              processedBy,
              currency: payment.currency,
            },
          ],
          { session }
        );

        if (payment.razorpayPaymentId) {
          // For Razorpay payments, initiate actual refund
          try {
            const razorpayRefund = await razorpayInstance.payments.refund(payment.razorpayPaymentId, {
              amount: Math.round(amountRefunded * 100),
            });

            refund.status = 'refunded';
            refund.refundedAt = new Date();
            refund.transactionDetails = {
              id: razorpayRefund.id,
              amount: razorpayRefund.amount,
              currency: razorpayRefund.currency,
              status: razorpayRefund.status,
            };
            await refund.save({ session });

            // Update payment status
            payment.paymentStatus = 'refunded';
            payment.refundedAt = new Date();
            await payment.save({ session });
          } catch (razorpayError) {
            refund.status = 'failed';
            refund.notes = razorpayError.message;
            await refund.save({ session });
            throw razorpayError;
          }
        } else {
          // For manual payments, mark as refunded
          refund.status = 'refunded';
          refund.refundedAt = new Date();
          await refund.save({ session });

          payment.paymentStatus = 'refunded';
          payment.refundedAt = new Date();
          await payment.save({ session });
        }

        // Update booking status if necessary
        const booking = await Booking.findById(payment.bookingId).session(session);
        if (booking) {
          const totalPaid = await Payment.aggregate([
            { $match: { bookingId: payment.bookingId, paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]);
          if (totalPaid[0]?.total >= booking.totalAmount) {
            booking.paymentStatus = 'completed';
          } else if (totalPaid[0]?.total > 0) {
            booking.paymentStatus = 'partially_paid';
          } else {
            booking.paymentStatus = 'pending';
          }
          await booking.save({ session });
        }
      });

      // Fetch created refund
      const createdRefund = await Refund.findOne({ paymentId, processedBy });

      res.status(201).json({
        success: true,
        refund: createdRefund,
      });
    } catch (error) {
      console.error('Refund Processing Error:', error);
      res.status(500).json({
        success: false,
        message: 'Refund processing failed',
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Refund processing failed',
      error: error.message,
    });
  }
};

// Get Payments by Booking
const getPaymentsByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate input
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
      });
    }

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Booking ID format. Must be a valid 24-character hexadecimal ObjectId',
      });
    }

    const payments = await Payment.find({ bookingId })
      .populate('modeOfPaymentId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
};

// Export all functions
module.exports = {
  createPaymentMethod,
  createRazorpayOrder,
  verifyPayment,
  recordManualPayment,
  processRefund,
  getPaymentsByBooking,
};