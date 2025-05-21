const Maid = require("../Models/maid");
const Cuisine = require("../Models/cusinie");
const { updateMaidProfile } = require("./maiddashController");
const { updateStatusMaid } = require("./formmaidController");

// Fetch all maids
const getMaids = async (req, res) => {
  try {
    // Populate the 'location' field from the Maid schema
    const maids = await Maid.find().populate('location');
    // Map maids to ensure userId is always present
    const formattedMaids = maids.map((maid) => ({
      ...maid.toObject(),
      userId: maid.userId || maid._id.toString(), // Fallback to _id if userId is missing
      fullName: maid.fullName || maid.name || 'Unknown', // Handle name/fullName
    }));
    console.log('Fetched maids:', formattedMaids);
    res.status(200).json(formattedMaids);
  } catch (error) {
    console.error('Error fetching maids:', error);
    res.status(500).json({ message: 'Error fetching maids', error: error.message });
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

const toggleMaidStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({ message: "Active status must be a boolean" });
    }

    const maid = await Maid.findByIdAndUpdate(
      id,
      { active },
      { new: true, runValidators: false } // runValidators: false to skip validation for other fields
    );

    if (!maid) {
      return res.status(404).json({ message: "Maid not found" });
    }

    res.status(200).json({ message: `Maid ${active ? "activated" : "deactivated"} successfully`, maid });
  } catch (error) {
    console.error("Error toggling maid status:", error);
    res.status(500).json({ message: "Error toggling maid status", error: error.message });
  }
  // const updateMaid = async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const { active, fullName, specialties, experience, image } = req.body;
  
  //     const updateData = {};
  //     if (typeof active === "boolean") {
  //       updateData.active = active;
  //     }
  //     if (fullName && specialties && Array.isArray(specialties) && experience) {
  //       updateData.fullName = fullName;
  //       updateData.specialties = specialties;
  //       updateData.experience = experience;
  //       if (image) updateData.image = image;
  //     }
  
  //     if (Object.keys(updateData).length === 0) {
  //       return res.status(400).json({ message: "No valid fields provided for update" });
  //     }
  
  //     const validExperiences = ["0-1 years", "1-3 years", "3-5 years", "5+ years"];
  //     if (updateData.experience && !validExperiences.includes(updateData.experience)) {
  //       return res.status(400).json({ message: "Invalid experience value" });
  //     }
  
  //     const maid = await Maid.findByIdAndUpdate(
  //       id,
  //       updateData,
  //       { new: true, runValidators: true }
  //     );
  
  //     if (!maid) {
  //       return res.status(404).json({ message: "Maid not found" });
  //     }
  
  //     res.status(200).json({ message: "Maid updated successfully", maid });
  //   } catch (error) {
  //     console.error("Error updating maid:", error);
  //     res.status(500).json({ message: "Error updating maid", error: error.message });
  //   }
  // };

};

const getMaidById = async (req, res) => {
  try {
    const { id } = req.params;
    const maid = await Maid.findById(id); // Fetch maid by ID from the database     
    if (!maid) {
      return res.status(404).json({ message: "Maid not found" });
    }
    res.status(200).json(maid); // Return the maid details
  }
  catch (error) {
    console.error("Error fetching maid by ID:", error);
    res.status(500).json({ message: "Error fetching maid", error: error.message });
  }
};

module.exports = {
  getMaids,
  getMaidById,
  addMaid,
  getCuisines,
  addCuisine,
  toggleMaidStatus,
  // updateMaid

  
};
