// Controller/maiddashController.js
const Maid = require('../Models/maid');

const getMaidProfile = async (req, res) => {
  try {
    const {id} =req.body
    const maid = await Maid.findById(id).select('-password');
    if (!maid) {
      return res.status(404).json({ msg: 'Maid not found' });
    }
    res.json(maid);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

const updateMaidProfile = async (req, res) => {
  // ... implementation ...
};

const toggleActiveStatus = async (req, res) => {
  // ... implementation ...
};

// Make sure to export all functions
module.exports = {
  getMaidProfile,
  updateMaidProfile,
  toggleActiveStatus
};