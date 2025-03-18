const Maid = require("../Models/maid");

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

module.exports = { getMaids, addMaid };
