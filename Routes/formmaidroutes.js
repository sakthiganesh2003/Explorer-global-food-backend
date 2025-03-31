const express = require('express');
const multer = require('multer');
const { addformMaid, getformMaids, updateStatusMaid } = require('../Controller/formmaidController');
const router = express.Router();
const mongoose = require('mongoose');
const formmaid = require('../Models/formmaid');
// Set up Multer storage for file uploads
const storage = multer.memoryStorage(); // Store in memory or use diskStorage for actual file saving
const upload = multer({ storage });

// Define routes
router.post('/', upload.single('aadhaarPhoto'), addformMaid);
router.get('/', getformMaids);
router.put('/:id', async(req,res) => {
    try {
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid ID format' 
          });
        }
    
        const application = await formmaid.findByIdAndUpdate(
          req.params.id,
          { status: req.body.status },
          { new: true, runValidators: true }
        );
        
        if (!application) {
          return res.status(404).json({ 
            success: false, 
            message: 'Maid not found' 
          });
        }
        
        res.json({ 
          success: true, 
          data: application 
        });
      } catch (err) {
        res.status(500).json({ 
          success: false, 
          message: err.message 
        });
      }
    
    }
);
module.exports = router;
