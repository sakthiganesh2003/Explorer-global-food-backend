const CuisineType = require("../Models/CuisineType");

// Create a new cuisine type
exports.createCuisineType = async (req, res) => {
  try {
    const { category_id, cuisine_type, order } = req.body;

    const newCuisineType = new CuisineType({
      category_id,
      cuisine_type,
      order,
    });

    const savedCuisineType = await newCuisineType.save();
    res.status(201).json({ message: "Cuisine type created", savedCuisineType });
  } catch (error) {
    res.status(500).json({ message: "Error creating cuisine type", error });
  }
};

// Get all cuisine types
exports.getCuisineTypes = async (req, res) => {
  try {
    const cuisineTypes = await CuisineType.find().populate("category_id");
    res.status(200).json(cuisineTypes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cuisine types", error });
  }
};

// Get a single cuisine type by ID
exports.getCuisineTypeById = async (req, res) => {
  try {
    const cuisineType = await CuisineType.findById(req.params.id).populate("category_id");

    if (!cuisineType) {
      return res.status(404).json({ message: "Cuisine type not found" });
    }

    res.status(200).json(cuisineType);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cuisine type", error });
  }
};

// Update a cuisine type
exports.updateCuisineType = async (req, res) => {
  try {
    const updatedCuisineType = await CuisineType.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: Date.now() },
      { new: true }
    );

    if (!updatedCuisineType) {
      return res.status(404).json({ message: "Cuisine type not found" });
    }

    res.status(200).json({ message: "Cuisine type updated", updatedCuisineType });
  } catch (error) {
    res.status(500).json({ message: "Error updating cuisine type", error });
  }
};

// Delete a cuisine type
exports.deleteCuisineType = async (req, res) => {
  try {
    const deletedCuisineType = await CuisineType.findByIdAndDelete(req.params.id);

    if (!deletedCuisineType) {
      return res.status(404).json({ message: "Cuisine type not found" });
    }

    res.status(200).json({ message: "Cuisine type deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting cuisine type", error });
  }
};
