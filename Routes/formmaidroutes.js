const express = require('express');
const multer = require('multer');
const { addformMaid, getformMaids, updateStatusMaid } = require('../Controller/formmaidController');
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
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const application = await formmaid.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Maid application not found' });
    }

    if (req.body.status === 'approved') {
      try {
        console.log(application.specialties)
        const cuisines = Array.isArray(application.specialties) ? application.specialties : [application.specialties || 'General'];

        const newMaid = new Maid({
          fullName: application.fullName,
          specialties: cuisines,
          rating: 0,
          experience: application.experience || '0-1 years', // Defaulting to valid enum value
          image: application.image || 'default.jpg'
        });
        console.log('New Maid:', newMaid); // Debugging line
        await newMaid.save();

        return res.json({
          success: true,
          data: application,
          maid: newMaid,
          message: 'Maid application approved and added to system'
        });
      } catch (saveError) {
        return res.status(500).json({ success: false, message: 'Error creating Maid: ' + saveError.message });
      }
    }

    res.json({ success: true, data: application, message: 'Status updated successfully' });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});
module.exports = router;
