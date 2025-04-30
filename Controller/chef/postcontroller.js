const Recipe = require('../../Models/chef/post'); // Adjust path if needed
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs'); // To delete local files if needed

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const recipeController = {
    createRecipe: async (req, res) => {
      try {
        const {
          chef_id,
          recipe_name,
          category_type,
          instructions,
          date_time,
          cuisine_type,
          file, // Add file to destructured req.body
        } = req.body;
  
        // Validate required fields
        if (!chef_id || !recipe_name || !category_type || !instructions || !date_time || !cuisine_type) {
          return res.status(400).json({ error: 'All fields are required' });
        }
  
        let image_videos = {};
  
        if (req.file) {
          // Handle file upload to Cloudinary
          const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'auto',
            folder: 'recipes',
          });
  
          // Delete local file
          fs.unlinkSync(req.file.path);
  
          image_videos = {
            url: result.secure_url,
            public_id: result.public_id,
          };
        } else if (file) {
          // Use provided URL
          image_videos = {
            url: file,
            public_id: 'external_url_' + Date.now(), // Placeholder public_id (or make public_id optional in schema)
          };
        } else {
          return res.status(400).json({ error: 'Image or video is required' });
        }
  
        const recipe = new Recipe({
          chef_id,
          image_videos,
          recipe_name,
          category_type,
          instructions,
          date_time,
          cuisine_type,
        });
  
        const savedRecipe = await recipe.save();
        res.status(201).json(savedRecipe);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error while creating recipe' });
      }
    },

  getAllRecipes: async (req, res) => {
    try {
      const recipes = await Recipe.find().populate('chef_id', 'name email');
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ error: 'Server error while fetching recipes' });
    }
  },

  getRecipeById: async (req, res) => {
    try {
      const recipe = await Recipe.findById(req.params.id)
        .populate('chef_id', 'name email');
  
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
  
      // Send chef_id separately along with the populated chef object
      const response = {
        ...recipe.toObject(), // Converts the Mongoose document to a plain object
        chef_raw_id: recipe.chef_id._id, // Explicitly include raw ID
      };
  
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Server error while fetching recipe' });
    }
  },
  
  

  updateRecipe: async (req, res) => {
    try {
      const updates = req.body;
      let image_videos = updates.image_videos;

      const recipe = await Recipe.findById(req.params.id);
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      if (req.file) {
        // Delete previous image/video from Cloudinary
        if (recipe.image_videos?.public_id) {
          await cloudinary.uploader.destroy(recipe.image_videos.public_id);
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'auto',
          folder: 'recipes'
        });

        fs.unlinkSync(req.file.path);
        image_videos = {
          url: result.secure_url,
          public_id: result.public_id
        };
      }

      const updatedRecipe = await Recipe.findByIdAndUpdate(
        req.params.id,
        { $set: { ...updates, image_videos } },
        { new: true }
      ).populate('chef_id', 'name email');

      res.json(updatedRecipe);
    } catch (error) {
      res.status(500).json({ error: 'Server error while updating recipe' });
    }
  },

  deleteRecipe: async (req, res) => {
    try {
      const recipe = await Recipe.findByIdAndDelete(req.params.id);
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      if (recipe.image_videos?.public_id) {
        await cloudinary.uploader.destroy(recipe.image_videos.public_id);
      }

      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Server error while deleting recipe' });
    }
  }
};

module.exports = recipeController;
