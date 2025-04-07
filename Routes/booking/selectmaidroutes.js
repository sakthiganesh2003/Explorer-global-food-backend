const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const Maid = require('../../Models/booking/selectmaid');

// GET all maids
router.get('/', async (req, res) => {
    try {
        const maids = await Maid.find();
        res.status(200).json({
            success: true,
            count: maids.length,
            data: maids
        });
    } catch (err) {
        console.error('Error fetching maids:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// GET single maid by ID
router.get('/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ID format'
            });
        }

        const maid = await Maid.findById(req.params.id);
        
        if (!maid) {
            return res.status(404).json({
                success: false,
                error: 'Maid not found'
            });
        }

        res.status(200).json({
            success: true,
            data: maid
        });
    } catch (err) {
        console.error('Error fetching maid:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// POST select a maid
// POST select a maid - Improved version with more debugging
router.post('/select/:id', async (req, res) => {
  try {
      const maidId = req.params.id;
      
      // 1. Validate ID format
      if (!ObjectId.isValid(maidId)) {
          console.log('Invalid ID format received:', maidId);
          return res.status(400).json({
              success: false,
              error: 'Invalid maid ID format',
              receivedId: maidId
              
          });
      }

      // 2. Check if maid exists
      console.log('Looking for maid with ID:', maidId);
      const maid = await Maid.findById(maidId);
      
      if (!maid) {
          console.log('No maid found with ID:', maidId);
          // Check what IDs actually exist in database
          const allMaids = await Maid.find({}, '_id');
          console.log('Existing maid IDs:', allMaids.map(m => m._id));
          
          return res.status(404).json({
              success: false,
              error: 'Maid not found',
              receivedId: maidId,
              existingIds: allMaids.map(m => m._id)
          });
      }

      // 3. Validate request body
      const { userId, bookingDate, servicesRequired } = req.body;
      if (!userId) {
          return res.status(400).json({
              success: false,
              error: 'User ID is required'
          });
      }

      // 4. Process the booking
      console.log('Creating booking for maid:', maidId);
      res.status(200).json({
          success: true,
          message: 'Maid selected successfully',
          maid: {
              id: maid._id,
              name: maid.fullName,
              specialties: maid.specialties,
              rating: maid.rating
          },
          bookingDetails: {
              userId,
              bookingDate,
              servicesRequired
          }
      });

  } catch (err) {
      console.error('Error in select maid endpoint:', err);
      res.status(500).json({
          success: false,
          error: 'Server Error',
          details: err.message
      });
  }
});

// Filter maids by criteria
router.get('/search/filter', async (req, res) => {
    try {
        const { cuisine, minRating, specialty, experience } = req.query;
        const query = {};
        
        if (cuisine) {
            query.cuisine = { $in: cuisine.split(',') };
        }
        
        if (minRating) {
            query.rating = { $gte: Number(minRating) };
        }
        
        if (specialty) {
            query.specialties = { $in: specialty.split(',') };
        }
        
        if (experience) {
            query.experience = { $gte: Number(experience) };
        }

        const maids = await Maid.find(query);
        
        res.status(200).json({
            success: true,
            count: maids.length,
            data: maids
        });
    } catch (err) {
        console.error('Error filtering maids:', err);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

module.exports = router;