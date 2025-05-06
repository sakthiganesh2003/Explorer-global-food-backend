// routes/recipeRoutes.js
const express = require('express');
const router = express.Router();
const recipeController = require('../../Controller/chef/postcontroller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to only accept images and videos
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Only image and video files are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Error handling middleware for Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  // Everything went fine
  next();
};

// POST new recipe
router.post(
  '/',
  upload.single('image_videos'), // Make sure this matches your form field name
  handleMulterError,
  recipeController.createRecipe
);

// GET all recipes
router.get('/', recipeController.getAllRecipes);

// GET single recipe by ID
router.get('/:id', recipeController.getRecipeById);

// UPDATE recipe by ID
router.put(
  '/:id',
  upload.single('image_videos'), // Same field name as POST
  handleMulterError,
  recipeController.updateRecipe
);

// DELETE recipe by ID
router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;