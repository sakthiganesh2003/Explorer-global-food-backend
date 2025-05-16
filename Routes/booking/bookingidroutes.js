const express = require('express');
const router = express.Router();
const bookingController = require('../../Controller/booking/bookingidcontroller');

// Routes for booking operations
router.get('/reject', bookingController.rejectBookings);


router.get('/', bookingController.getAllBookings);
router.get('/:id', bookingController.getBookingByMaidId);
router.get('/user/:id', bookingController.getBookingByUserId);
router.post('/', bookingController.createBooking);
router.put('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.deleteBooking);
router.put('/status/:id', bookingController.updateBookingStatus);

router.post('/refund', bookingController.handleRejection);
 router.get('/payment-details/:id', bookingController.getPaymentDetailsByBookingId);

router.get('/total', bookingController.getBookingByMaidId);
router.get('/all/status',bookingController.getStats)
router.get('/bookings/maids/:id',bookingController.getBookingsByMaidId)
router.get('/admin/earings/',bookingController.getTotalEarnings)
 console.log("Total Orders Route Hit");




module.exports = router;