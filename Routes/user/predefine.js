const express = require('express');
const router = express.Router();
const {
  createCountry,
  createState,
  createtheCitys,
  createCategory,
  createProgrammingSkill,
  getAllCountries,
  getAllStates,
  getAllCategories,
  getStatesByCountryId,
  getAllProgrammingSkills,
  updateCountry,
  updateState,
  updateCategory,
  updateProgrammingSkill,
  deleteCountry,
  deleteState,
  deleteCategory,
  deleteProgrammingSkill
} = require('../../Controller/user/predefine');

// Routes for Country
router.post('/countries', createCountry);
router.get('/countries', getAllCountries); // Get all countries
router.get('/states/:countryId', getStatesByCountryId);
router.put('/countries/:id', updateCountry); // Update a country
router.delete('/countries/:id', deleteCountry); // Delete a country

// Routes for State
router.post('/states', createState);
router.get('/states', getAllStates); // Get all states
router.put('/states/:id', updateState); // Update a state
router.delete('/states/:id', deleteState); // Delete a state



//Routes for citys
 router.post('/citys', createtheCitys);


// Routes for Category
router.post('/categories', createCategory);
router.get('/categories', getAllCategories); // Get all categories
router.put('/categories/:id', updateCategory); // Update a category
router.delete('/categories/:id', deleteCategory); // Delete a category


module.exports = router;