// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus
} = require('../../Controller/booking/bookingcontroller'); // Adjust path to your controller

router.route('/')
  .get(getAllBookings)
  .post(createBooking);

router.route('/:id')
  .get(getBooking)
  .put(updateBooking)
  .delete(deleteBooking);

router.route('/:id/status')
  .put(updateBookingStatus);

module.exports = router;