// Controller/chef/postcontroller.js
const Recipe = require('../../Models/chef/post');
const cloudinary = require('../../Config/cloudinarys'); // Import configured Cloudinary
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

// Configure Multer
const storage = multer.memoryStorage(); // Store files in memory for streaming to Cloudinary
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!validTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, WEBP images or MP4 videos are allowed'), false);
    }
    cb(null, true);
  },
}).single('image');

// Middleware to handle Multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Uploaded file is too large (max 50MB)' });
    }
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

const createRecipe = async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ['recipe_name', 'instructions', 'ingredients'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Parse ingredients if they're sent as JSON string
    let ingredients;
    try {
      ingredients = Array.isArray(req.body.ingredients)
        ? req.body.ingredients
        : JSON.parse(req.body.ingredients);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Ingredients must be a valid array or JSON string',
      });
    }

    // Handle file upload
    let media = null;
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video');
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'recipe_uploads',
            resource_type: isVideo ? 'video' : 'image',
            quality: 'auto',
            fetch_format: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer); // Stream Multer's file buffer to Cloudinary
      });

      media = {
        url: result.secure_url,
        public_id: result.public_id,
        media_type: isVideo ? 'video' : 'image',
        width: result.width,
        height: result.height,
        format: result.format,
        duration: isVideo ? result.duration : undefined,
      };
    } else if (req.body.media) {
      // Handle media URL if provided in the body
      const mediaUrl = req.body.media;
      const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/;
      if (!urlRegex.test(mediaUrl)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid media URL format',
        });
      }

      media = {
        url: mediaUrl,
        public_id: null,
        media_type: mediaUrl.includes('.mp4') ? 'video' : 'image',
        width: null,
        height: null,
        format: mediaUrl.split('.').pop().toLowerCase(),
        duration: null,
      };
    }

    // Create recipe object
    const recipeData = {
      recipe_name: req.body.recipe_name,
      category_type: req.body.category_type || 'Other',
      instructions: req.body.instructions,
      cuisine_type: req.body.cuisine_type || 'International',
      ingredients,
      prep_time: parseInt(req.body.prep_time) || 0,
      cook_time: parseInt(req.body.cook_time) || 0,
      servings: parseInt(req.body.servings) || 1,
      created_by: req.id || 'default_user',
      media,
    };

    // Save to database
    const newRecipe = new Recipe(recipeData);
    console.log('New recipe data:', newRecipe);
    const savedRecipe = await newRecipe.save();

    // Format response
    const response = {
      success: true,
      message: 'Recipe created successfully',
      data: {
        ...savedRecipe.toObject(),
        media_url: savedRecipe.media?.url || null,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create recipe error:', error);
    if (error.http_code) {
      return res.status(error.http_code).json({
        success: false,
        error: `Cloudinary error: ${error.message}`,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};


const getAllRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find()
      .populate('name avatar')
      .sort({ created_at: -1 })
      .limit(10); // Limit to 10 recipes for the initial load

    res.status(200).json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error('Get all recipes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipes',
    });
  }
};


const getAllRecipesid = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter = {};
    if (req.query.category) {
      filter.category_type = req.query.category;
    }
    if (req.query.cuisine) {
      filter.cuisine_type = req.query.cuisine;
    }
    if (req.query.search) {
      filter.$or = [
        { recipe_name: { $regex: req.query.search, $options: 'i' } },
        { instructions: { $regex: req.query.search, $options: 'i' } },
        { ingredients: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Sorting
    const sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }

    // Query execution
    const recipes = await Recipe.find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort);

    const total = await Recipe.countDocuments(filter);

    res.json({
      success: true,
      count: recipes.length,
      page,
      pages: Math.ceil(total / limit),
      total,
      data: recipes,
    });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipes',
    });
  }
};

const getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate(
      '',
      ''
    );

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found',
      });
    }
    res.json({
      success: true,
      data: recipe,
    });
  } catch (error) {
    console.error('Get recipe error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipe',
    });
  }
};

const updateRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found',
      });
    }

    // Check ownership
    if (recipe.created_by.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this recipe',
      });
    }

    // Handle file upload if exists
    let newMedia = null;
    if (req.file) {
      // Delete old media if exists
      if (recipe.media?.public_id) {
        await cloudinary.uploader.destroy(recipe.media.public_id, {
          resource_type: recipe.media.media_type === 'video' ? 'video' : 'image',
        });
      }

      // Upload new media
      const isVideo = req.file.mimetype.startsWith('video');
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'recipe_uploads',
            resource_type: isVideo ? 'video' : 'image',
            quality: 'auto',
            fetch_format: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      newMedia = {
        url: result.secure_url,
        public_id: result.public_id,
        media_type: isVideo ? 'video' : 'image',
        width: result.width,
        height: result.height,
        format: result.format,
        duration: isVideo ? result.duration : undefined,
      };
    } else if (req.body.media) {
      // Handle media URL if provided in the body
      const mediaUrl = req.body.media;
      const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/;
      if (!urlRegex.test(mediaUrl)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid media URL format',
        });
      }

      newMedia = {
        url: mediaUrl,
        public_id: null,
        media_type: mediaUrl.includes('.mp4') ? 'video' : 'image',
        width: null,
        height: null,
        format: mediaUrl.split('.').pop().toLowerCase(),
        duration: null,
      };
    }

    // Update recipe fields
    const updates = Object.keys(req.body);
    updates.forEach(update => {
      if (update === 'ingredients') {
        try {
          recipe[update] = Array.isArray(req.body[update])
            ? req.body[update]
            : JSON.parse(req.body[update]);
        } catch (e) {
          console.error('Error parsing ingredients:', e);
        }
      } else if (update !== 'media') {
        recipe[update] = req.body[update];
      }
    });

    // Update media if new file was uploaded or URL provided
    if (newMedia) {
      recipe.media = newMedia;
    }

    const updatedRecipe = await recipe.save();
    res.json({
      success: true,
      message: 'Recipe updated successfully',
      data: updatedRecipe,
    });
  } catch (error) {
    console.error('Update recipe error:', error);
    if (error.http_code) {
      return res.status(error.http_code).json({
        success: false,
        error: `Cloudinary error: ${error.message}`,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update recipe',
    });
  }
};

const deleteRecipe = async (req, res) => {
  try {
    // Validate recipe ID
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Recipe ID is required',
      });
    }

    // Find recipe
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found',
      });
    }

    // Check if req.user exists (set by auth middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Check ownership if created_by exists
    if (!recipe.created_by) {
      console.warn(`Recipe ${recipe._id} has no created_by field`);
      return res.status(403).json({
        success: false,
        error: 'Recipe ownership information missing',
      });
    }

    if (recipe.created_by.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this recipe',
      });
    }

    // Delete media from Cloudinary if exists
    if (recipe.media?.public_id) {
      try {
        await cloudinary.uploader.destroy(recipe.media.public_id, {
          resource_type: recipe.media.media_type === 'video' ? 'video' : 'image',
        });
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
        // Continue with deletion even if media deletion fails
      }
    }

    // Delete recipe
    await recipe.deleteOne();
    res.json({
      success: true,
      message: 'Recipe deleted successfully',
    });
  } catch (error) {
    console.error('Delete recipe error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete recipe',
    });
  }
};

// Export with Multer middleware for routes that handle file uploads
module.exports = {
  createRecipe: [upload, handleMulterError, createRecipe],
  getAllRecipesid,
  getRecipeById,
  getAllRecipes,
  updateRecipe: [upload, handleMulterError, updateRecipe],
  deleteRecipe,
};