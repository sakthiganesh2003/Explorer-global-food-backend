const Maid = require('../Models/formmaid');

const addformMaid = async (req, res) => {
  try {
    const { fullName, email, phone, experience, specialties, bio, availability, aadhaarNumber } = req.body;
    
    const aadhaarPhoto = req.file ? req.file.path : null; // Get file path if uploaded

    const maid = new Maid({
      fullName,
      email,
      phone,
      experience,
      specialties: specialties ? specialties.split(',') : [], // Convert string to array
      bio,
      availability: availability ? availability.split(',') : [], // Convert string to array
      aadhaarPhoto,
      aadhaarNumber
    });

    await maid.save();
    res.status(201).json({ message: 'Maid added successfully', maid });
  } catch (error) {
    res.status(500).json({ message: 'Error adding maid', error });
  }
};

const getformMaids = async (req, res) => {
  try {
    const maids = await Maid.find();
    res.json(maids);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maids', error });
  }
};

module.exports = { addformMaid, getformMaids };
