const express = require('express');
const router = express.Router();
const Payment = require('../../Models/payment/modeofpayment');
const ModeOfPayment = require('../../Models/payment/modeofpayment');

// Create a new payment
router.post('/', async (req, res) => {
    try {
      const { bookingId, requestId, modeOfPaymentId, amount, customerRequest } = req.body;
      
      // Validate mode of payment exists
      const modeExists = await ModeOfPayment.findById(modeOfPaymentId);
      if (!modeExists) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }
  
      const payment = new Payment({
        bookingId,  // Changed from orderId to bookingId
        requestId,
        modeOfPaymentId,
        amount,
        customerRequest,
        paymentStatus: 'pending'
      });
  
      const savedPayment = await payment.save();
      res.status(201).json(savedPayment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get all payments
  router.get('/', async (req, res) => {
    try {
      const { status, bookingId, requestId } = req.query;  // Changed orderId to bookingId
      const filter = {};
      
      if (status) filter.paymentStatus = status;
      if (bookingId) filter.bookingId = bookingId;  // Changed orderId to bookingId
      if (requestId) filter.requestId = requestId;
  
      const payments = await Payment.find(filter)
        .populate('bookingId')  // Changed from orderId to bookingId
        .populate('requestId')
        .populate('modeOfPaymentId');
        
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get a specific payment
  router.get('/:id', async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.id)
        .populate('bookingId')  // Changed from orderId to bookingId
        .populate('requestId')
        .populate('modeOfPaymentId');
        
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update payment status
  router.patch('/:id/status', async (req, res) => {
    try {
      const { status, customerResponse } = req.body;
      
      if (!['completed', 'pending', 'failed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
  
      const update = { 
        paymentStatus: status,
        updatedAt: Date.now()
      };
  
      if (status === 'completed') update.completedAt = Date.now();
      if (status === 'failed') update.failedAt = Date.now();
      if (customerResponse) update.customerResponse = customerResponse;
  
      const payment = await Payment.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true }
      ).populate('modeOfPaymentId');
  
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
  
      res.json(payment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get available payment methods
  router.get('/methods/available', async (req, res) => {
    try {
      const methods = await ModeOfPayment.find({ isActive: true });
      res.json(methods);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  module.exports = router;