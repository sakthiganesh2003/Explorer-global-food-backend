const express = require('express');
const router = express.Router();
const scheduleController = require('../Controller/timeSlotController');

router.post('/', scheduleController.createSchedule);
router.get('/schedules', scheduleController.getSchedules);

module.exports = router;