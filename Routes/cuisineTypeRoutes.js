const express = require("express");
const {
  createCuisineType,
  getCuisineTypes,
  getCuisineTypeById,
  updateCuisineType,
  deleteCuisineType,
} = require("../Controller/cuisineTypeController");

const router = express.Router();

router.post("/", createCuisineType);     // Create new cuisine type
router.get("/", getCuisineTypes);        // Get all cuisine types
router.get("/:id", getCuisineTypeById);  // Get single cuisine type
router.put("/:id", updateCuisineType);   // Update cuisine type
router.delete("/:id", deleteCuisineType);// Delete cuisine type

module.exports = router;
