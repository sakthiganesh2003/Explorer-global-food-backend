const Maid = require("../Models/maid");
const Cuisine = require("../Models/cusinie");

// Fetch all maids
const getMaids = async (req, res) => {
  try {
    const maids = await Maid.find();
    res.status(200).json(maids);
  } catch (error) {
    console.error("Error fetching maids:", error);
    res.status(500).json({ message: "Error fetching maids", error: error.message });
  }
};

// Add a new maid
const addMaid = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Debugging

    const { name, cuisine, rating, experience, image } = req.body;
    
    if (!name || !cuisine || !rating || !experience || !image) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newMaid = new Maid({ name, cuisine, rating, experience, image });
    await newMaid.save();

    res.status(201).json({ message: "Maid added successfully", maid: newMaid });
  } catch (error) {
    console.error("Error adding maid:", error); // Logs the error in the console
    res.status(500).json({ message: "Error adding maid", error: error.message });
  }
};


// select cusion



// Fetch all cuisines
const getCuisines = async (req, res) => {
  try {
    const cuisines = await Cuisine.find();
    res.status(200).json(cuisines);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cuisines", error: error.message });
  }
};

// Add a new cuisine
const addCuisine = async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Cuisine name is required" });
    }

    const newCuisine = new Cuisine({ name, image });
    await newCuisine.save();

    res.status(201).json({ message: "Cuisine added successfully", cuisine: newCuisine });
  } catch (error) {
    res.status(500).json({ message: "Error adding cuisine", error: error.message });
  }
};

module.exports = {
  getMaids,
  addMaid,
  getCuisines,
  addCuisine,
};
