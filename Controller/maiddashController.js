// Controller/maiddashController.js
const Maid = require('../Models/maid');

const getMaidProfile = async (req, res) => {
  try {
      // Log the request
      console.log('get maid profile');
      
      // Get the maid ID from request parameters
      const userId = req.params.id;
      
      // Check if ID is provided
      if (!userId) {
          return res.status(400).json({
              success: false,
              message: 'Maid ID is required'
          });
      }

      // Find maid by ID in the database
      const maid = await Maid.findById(userId);

      // Check if maid exists
      if (!maid) {
          return res.status(404).json({
              success: false,
              message: 'Maid not found'
          });
      }

      // Return maid details
      return res.status(200).json({
          success: true,
          data: {
              id: maid._id,
              fullName: maid.fullName,
              specialties: maid.specialties,
              rating: maid.rating,
              experience: maid.experience,
              image: maid.image
          }
      });

  } catch (error) {
      // Handle any errors
      console.error('Error fetching maid profile:', error);
      return res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: error.message
      });
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