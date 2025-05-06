const Recipe = require('../../Models/chef/post'); // Adjusted path
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const recipeController = {
  createRecipe: async (req, res) => {
    try {
      const {
        recipe_name,
        category_type,
        instructions,
        date_time,
        cuisine_type,
        ingredients,
        prep_time,
        cook_time,
        servings,
      } = req.body;

      // Validation is handled by middleware (validateRecipe)
      let image_videos = {};

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'auto',
          folder: 'recipes',
        });

        fs.unlinkSync(req.file.path);
        image_videos = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      }

      const recipe = new Recipe({
        recipe_name,
        category_type,
        instructions,
        date_time: date_time || Date.now(),
        cuisine_type,
        ingredients,
        prep_time,
        cook_time,
        servings,
        image_videos,
        created_by: req.user.id, // Set from auth middleware
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
      const recipes = await Recipe.find().populate('created_by', 'name email');
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ error: 'Server error while fetching recipes' });
    }
  },

  getRecipeById: async (req, res) => {
    try {
      const recipe = await Recipe.findById(req.params.id).populate(
        'created_by',
        'name email'
      );

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      const response = {
        ...recipe.toObject(),
        created_by_raw_id: recipe.created_by?._id,
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

      if (recipe.created_by.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (req.file) {
        if (recipe.image_videos?.public_id) {
          await cloudinary.uploader.destroy(recipe.image_videos.public_id);
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'auto',
          folder: 'recipes',
        });

        fs.unlinkSync(req.file.path);
        image_videos = {
          url: result.secure_url,
          public_id: result.public_id,
        };
      }

      const updatedRecipe = await Recipe.findByIdAndUpdate(
        req.params.id,
        { $set: { ...updates, image_videos, created_by: req.user.id } },
        { new: true }
      ).populate('created_by', 'name email');

      res.json(updatedRecipe);
    } catch (error) {
      res.status(500).json({ error: 'Server error while updating recipe' });
    }
  },

  deleteRecipe: async (req, res) => {
    try {
      const recipe = await Recipe.findById(req.params.id);
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      if (recipe.created_by.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (recipe.image_videos?.public_id) {
        await cloudinary.uploader.destroy(recipe.image_videos.public_id);
      }

      await recipe.deleteOne();
      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Server error while deleting recipe' });
    }
  },
};

module.exports = recipeController;