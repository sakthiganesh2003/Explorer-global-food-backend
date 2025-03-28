const express = require('express');
const multer = require('multer');
const { addformMaid, getformMaids } = require('../Controller/formmaidController');

const router = express.Router();

// Set up Multer storage for file uploads
const storage = multer.memoryStorage(); // Store in memory or use diskStorage for actual file saving
const upload = multer({ storage });

// Define routes
router.post('/', upload.single('aadhaarPhoto'), addformMaid);
router.get('/', getformMaids);

module.exports = router;
