// routes/recipeRoutes.js
const express = require('express');
const router = express.Router();
const recipeController = require('../../Controller/chef/postcontroller');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// POST new recipe
router.post('/', upload.single('image_videos'), recipeController.createRecipe);

// GET all recipes
router.get('/', recipeController.getAllRecipes);

// GET single recipe by ID
router.get('/:id', recipeController.getRecipeById);

// UPDATE recipe by ID
router.put('/:id', upload.single('image_videos'), recipeController.updateRecipe);

// DELETE recipe by ID
router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;
