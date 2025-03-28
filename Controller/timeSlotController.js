const Schedule = require('../Models/timeSlotModel');

exports.createSchedule = async (req, res) => {
  try {
    const { date, timeSlots } = req.body;

    if (!date || !timeSlots || !timeSlots.length) {
      return res.status(400).json({ 
        error: 'Date and at least one time slot are required' 
      });
    }

    const newSchedule = new Schedule({
      date,
      timeSlots
    });

    const savedSchedule = await newSchedule.save();
    
    res.status(201).json({
      message: 'Schedule created successfully',
      schedule: savedSchedule
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error creating schedule',
      details: error.message 
    });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ createdAt: -1 });
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error fetching schedules',
      details: error.message 
    });
  }
};