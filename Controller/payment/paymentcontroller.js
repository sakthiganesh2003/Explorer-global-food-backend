import { ModeOfPayment, Payment, Refund } from '../../Models/payment/payment.js';
import Booking from '../../Models/booking/bookingmodel.js';
import razorpayInstance from '../../Config/razorpay.js';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Create Payment Method
export const createPaymentMethod = async (req, res) => {
  try {
    const { bookingId, modeOfPayment, details } = req.body;
    
    if (!bookingId || !modeOfPayment) {
      return res.status(400).json({ 
        success: false,
        message: 'Booking ID and payment method are required' 
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    const paymentMethod = await ModeOfPayment.create({
      modeOfPayment,
      bookingId,
      details,
      displayName: modeOfPayment.charAt(0).toUpperCase() + modeOfPayment.slice(1)
    });

    res.status(201).json({
      success: true,
      paymentMethod
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to create payment method',
      error: error.message 
    });
  }
};

// Create Razorpay Order
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', bookingId, paymentType = 'full', installmentNumber = 0 } = req.body;
    
    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Amount must be a positive number' 
      });
    }

    if (!bookingId) {
      return res.status(400).json({ 
        success: false,
        message: 'Booking ID is required' 
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    // Check for existing payment method or create one
    let paymentMethod = await ModeOfPayment.findOne({ 
      bookingId, 
      modeOfPayment: 'razorpay' 
    });

    if (!paymentMethod) {
      paymentMethod = await ModeOfPayment.create({
        modeOfPayment: 'razorpay',
        bookingId,
        displayName: 'Razorpay'
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
        installmentNumber
      }
    };

    const order = await razorpayInstance.orders.create(options);
    
    // Create payment record
    const payment = await Payment.create({
      modeOfPaymentId: paymentMethod._id,
      bookingId: booking._id,
      amount,
      currency,
      paymentStatus: 'pending',
      paymentType,
      installmentNumber,
      payId: order.id,
      razorpayOrderId: order.id,
      transactionDetails: order
    });

    res.status(201).json({
      success: true,
      order,
      payment
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to create Razorpay order',
      error: error.message 
    });
  }
};

// Verify Payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required payment verification fields' 
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid payment signature' 
      });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ 
        success: false,
        message: 'Payment record not found' 
      });
    }

    // Update booking status if needed
    await Booking.findByIdAndUpdate(payment.bookingId, { 
      $set: { paymentStatus: 'completed' } 
    });

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Payment verification failed',
      error: error.message 
    });
  }
};

// Record Manual Payment
export const recordManualPayment = async (req, res) => {
  try {
    const { bookingId, modeOfPayment, amount, paymentType, recordedBy, notes } = req.body;
    
    if (!bookingId || !modeOfPayment || !amount || !recordedBy) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    // Find or create payment method
    let paymentMethod = await ModeOfPayment.findOne({ 
      bookingId, 
      modeOfPayment 
    });

    if (!paymentMethod) {
      paymentMethod = await ModeOfPayment.create({
        modeOfPayment,
        bookingId,
        displayName: modeOfPayment.charAt(0).toUpperCase() + modeOfPayment.slice(1)
      });
    }

    // Create payment record
    const payment = await Payment.create({
      modeOfPaymentId: paymentMethod._id,
      bookingId,
      amount,
      paymentStatus: 'completed',
      paymentType: paymentType || 'full',
      payId: `manual_${uuidv4()}`,
      recordedBy,
      completedAt: new Date(),
      notes
    });

    // Update booking status
    await Booking.findByIdAndUpdate(bookingId, { 
      $set: { paymentStatus: 'completed' } 
    });

    res.status(201).json({
      success: true,
      payment
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to record manual payment',
      error: error.message 
    });
  }
};

// Process Refund
export const processRefund = async (req, res) => {
  try {
    const { paymentId, amountRefunded, refundReason, processedBy } = req.body;
    
    if (!paymentId || !amountRefunded || !processedBy) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        success: false,
        message: 'Payment not found' 
      });
    }

    if (payment.amount < amountRefunded) {
      return res.status(400).json({ 
        success: false,
        message: 'Refund amount cannot exceed payment amount' 
      });
    }

    // Create refund record
    const refund = await Refund.create({
      paymentId,
      amountRefunded,
      status: 'pending',
      refundReason,
      processedBy,
      currency: payment.currency
    });

    // For Razorpay payments, initiate actual refund
    if (payment.razorpayPaymentId) {
      try {
        const razorpayRefund = await razorpayInstance.payments.refund(
          payment.razorpayPaymentId,
          { amount: Math.round(amountRefunded * 100) }
        );

        refund.status = 'refunded';
        refund.refundedAt = new Date();
        refund.transactionDetails = razorpayRefund;
        await refund.save();

        // Update payment status
        payment.paymentStatus = 'refunded';
        payment.refundedAt = new Date();
        await payment.save();

      } catch (razorpayError) {
        refund.status = 'failed';
        refund.notes = razorpayError.message;
        await refund.save();

        throw razorpayError;
      }
    } else {
      // For manual payments, just mark as refunded
      refund.status = 'refunded';
      refund.refundedAt = new Date();
      await refund.save();

      payment.paymentStatus = 'refunded';
      payment.refundedAt = new Date();
      await payment.save();
    }

    res.status(201).json({
      success: true,
      refund
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Refund processing failed',
      error: error.message 
    });
  }
};

// Get Payments by Booking
export const getPaymentsByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    if (!bookingId) {
      return res.status(400).json({ 
        success: false,
        message: 'Booking ID is required' 
      });
    }

    const payments = await Payment.find({ bookingId })
      .populate('modeOfPaymentId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch payments',
      error: error.message 
    });
  }
};