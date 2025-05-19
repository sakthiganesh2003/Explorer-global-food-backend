// routes/chef/post.js
const express = require('express');
const router = express.Router();
const recipeController = require('../../Controller/chef/postcontroller');

// POST new recipe
router.post('/', recipeController.createRecipe);

// GET all recipes
router.get('/', recipeController.getAllRecipesid);

// GET single recipe by ID
router.get('/:id', recipeController.getRecipeById);

router.get('/recipes', recipeController.getAllRecipes);

// UPDATE recipe by ID
router.put('/:id', recipeController.updateRecipe);

// DELETE recipe by ID
router.delete('/:id', recipeController.deleteRecipe);

const { getchefpoststatus } = require('../../Controller/chef/postcontroller');
router.get('/chef/status/:id', recipeController.getChefRecipesStatusById)

module.exports = router;