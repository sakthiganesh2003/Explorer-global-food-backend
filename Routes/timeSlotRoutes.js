const express = require('express');
const router = express.Router();
const {
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule
} = require('../Controller/timeSlotController');
// const { protect } = require('../middlewares/auth');

// router.use(protect);

router.route('/')
  .post(createSchedule)
  .get(getSchedules);

router.route('/:id')
  .get(getSchedule)
  .put(updateSchedule)
  .delete(deleteSchedule);

module.exports = router;