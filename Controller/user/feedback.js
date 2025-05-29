// Controller/user/feedback.js
import Booking from '../../Models/booking/bookingmodel.js';
import Feedback from '../../Models/user/feedback.js';


// POST /api/feedback
export const createsFeedback = async (req, res) => {
  try {
    const { bookingId, userId, rating, comment } = req.body;

    // Validate input
    if (!bookingId || !userId || !rating || !comment) {
      return res.status(400).json({ error: 'Booking ID, user ID, rating, and comment are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure the user is authorized to submit feedback for this booking
    if (booking.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to submit feedback for this booking' });
    }

    // Check if booking is confirmed
    if (booking.status.toLowerCase() !== 'confirmed') {
      return res.status(400).json({ error: 'Feedback can only be submitted for confirmed bookings' });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ bookingId, userId });
    if (existingFeedback) {
      return res.status(400).json({ error: 'Feedback already submitted for this booking' });
    }

    // Create new feedback
    const feedback = new Feedback({
      bookingId,
      userId,
      rating,
      comment,
      createdAt: new Date(),
    });

    await feedback.save();

    // Return the created feedback
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
// GET /api/feedback/:bookingId
// GET /api/feedback/:bookingId
// export const getFeedback = async (req, res) => {
//   try {
//     console.log(req.params)
//     const { Id } = req.params;

//     // Validate bookingId
//     if (!Id) {
//       return res.status(400).json({ error: 'Booking ID is required' });
//     }

//     // Verify booking exists
//     const booking = await Booking.findById(Id);
//     if (!booking) {
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     // TODO: Add authentication check (recommended for production)
//     // Example: Verify the requesting user owns the booking or has permission
//     // const userId = req.session?.userId; // Replace with your auth mechanism
//     // if (!userId || booking.userId.toString() !== userId) {
//     //   return res.status(403).json({ error: 'Unauthorized to view feedback' });
//     // }

//     // Find all feedback for the booking
//     const feedbacks = await Feedback.find({ Id });
//     if (!feedbacks.length) {
//       return res.status(404).json({ error: 'No feedback found for this booking' });
//     }

//     // Return all feedback
//     res.status(200).json(feedbacks);
//   } catch (error) {
//     console.error('Error retrieving feedback:', error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// / GET /api/feedback
export const getAllFeedbacks= async (req, res) => {
  try {
    // Assuming you have a Feedback model or database connection
    // Example with Mongoose (MongoDB):
    const feedbacks = await Feedback.find({}).sort({ createdAt: -1 }); // Get all feedback, newest first
    
    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
    
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// GET /api/feedback/by-id/:feedbackId
export const getFeedbackByid = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    // Validate feedbackId
    if (!feedbackId) {
      return res.status(400).json({ error: 'Feedback ID is required' });
    }

    // Find feedback by ID
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Optional: Authentication check (uncomment and adjust based on your auth mechanism)
    
    const userId = req.session?.userId; // Replace with your auth mechanism
    if (!userId || feedback.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this feedback' });
    }
    

    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error retrieving feedback by ID:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};