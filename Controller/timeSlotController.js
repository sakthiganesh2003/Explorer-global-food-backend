const Schedule = require('../Models/timeSlotModel');
// const ErrorResponse = require('../utils/errorResponse');

// Create a new schedule
exports.createSchedule = async (req, res, next) => {
  try {
    const { date, times, address, phone, timeSlots, maidId } = req.body;
    
    if (!date || !times || !address || !phone || !timeSlots?.length || !maidId) {
      return next(new ErrorResponse('All fields are required', 400));
    }

    const schedule = await Schedule.create({
      date,
      times,
      address,
      phone,
      timeSlots,
      maidId,
      userId: req.user.id
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

// Get all schedules
exports.getSchedules = async (req, res, next) => {
  try {
    const schedules = await Schedule.find({ userId: req.user.id });
    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
};

// Get single schedule
exports.getSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return next(new ErrorResponse('Schedule not found', 404));
    }
    
    if (schedule.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 401));
    }
    
    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

// Update schedule
exports.updateSchedule = async (req, res, next) => {
  try {
    let schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return next(new ErrorResponse('Schedule not found', 404));
    }
    
    if (schedule.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 401));
    }
    
    schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

// Delete schedule
exports.deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return next(new ErrorResponse('Schedule not found', 404));
    }
    
    if (schedule.userId.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 401));
    }
    
    await schedule.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};