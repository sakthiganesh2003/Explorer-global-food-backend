const express = require('express');
const multer = require('multer');
const { addformMaid, getformMaids, updateStatusMaid, deleteMaid, deleteMaids } = require('../Controller/formmaidController');
const router = express.Router();
const mongoose = require('mongoose');
const formmaid = require('../Models/formmaid');
// Set up Multer storage for file uploads
const storage = multer.memoryStorage(); // Store in memory or use diskStorage for actual file saving
const upload = multer({ storage });
const Maid = require('../Models/maid'); // Assuming you have a Maid model defined
// Define routes
router.post('/', upload.single('aadhaarPhoto'), addformMaid);
router.get('/', getformMaids);
// DELETE /api/maids/:id
// router.delete('/:id', maidController.deleteMaid);
// // DELETE /api/maids
// router.delete('/', maidController.deleteMaids);
// // Request body: { ids: ['id1', 'id2', 'id3'] }

// PUT endpoint to update maid application status and create a Maid if approved
router.put('/:id', async (req, res) => {
  try {
    // Validate the application ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID format' });
    }

    // Update the maid application status
    const application = await formmaid.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Maid application not found' });
    }

    // If status is 'approved', create a new Maid
    if (req.body.status === 'approved') {
      try {
        // Ensure specialties is an array
        const cuisines = Array.isArray(application.specialties)
          ? application.specialties
          : [application.specialties || 'General'];

        // Normalize experience (remove " years" and ensure valid enum value)
        const experienceValue = application.experience
          ? application.experience.replace(' years', '') // Remove " years" suffix
          : '0-1'; // Default value if experience is missing

        // Validate userId as ObjectId
        if (!mongoose.Types.ObjectId.isValid(application.userId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid userId format: Must be a valid ObjectId'
          });
        }

        // Set location and pincode (use application data or defaults)
        const locationValue = application.location || 'Unknown'; // Fallback if location is missing
        const pincodeValue = application.pincode || null; // Set to null if optional, or provide a default

        // Create new Maid instance
        const newMaid = new Maid({
          userId: application.userId, // Should be an ObjectId
          fullName: application.fullName,
          specialties: cuisines,
          rating: 0,
          experience: experienceValue, // Normalized value
          image: application.image || 'default.jpg',
          location: locationValue, // Use application.location or default
          pincode: pincodeValue // Use application.pincode or null (if optional)
        });

        // Debugging: Log the newMaid object to inspect values
        console.log('New Maid:', newMaid);

        // Save the new Maid
        await newMaid.save();

        // Return success response with updated application and new Maid
        return res.json({
          success: true,
          data: application,
          maid: newMaid,
          message: 'Maid application approved and added to system'
        });
      } catch (saveError) {
        console.error('Error creating Maid:', saveError);
        return res.status(500).json({
          success: false,
          message: 'Error creating Maid: ' + saveError.message
        });
      }
    }

    // If status is not 'approved', return updated application
    res.json({ success: true, data: application, message: 'Status updated successfully' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
