const express = require('express');
const router = express.Router();
const bookingController = require('../../Controller/booking/bookingidcontroller');

// Routes for booking operations
router.get('/', bookingController.getAllBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/', bookingController.createBooking);
router.put('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.deleteBooking);
router.put('/:id/accept', bookingController.acceptBooking);
router.put('/:id/reject', bookingController.rejectBooking);

module.exports = router;