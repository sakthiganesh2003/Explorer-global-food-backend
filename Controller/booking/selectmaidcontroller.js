const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const router = express.Router();

// MongoDB connection URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

// Connect to MongoDB
async function connectToDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }
}

connectToDB();

// Endpoint to get all maids
router.get('/maids', async (req, res) => {
  try {
    const database = client.db('maidServiceDB');
    const maidsCollection = database.collection('maids');
    
    const maids = await maidsCollection.find({}).toArray();
    res.status(200).json(maids);
  } catch (error) {
    console.error('Error fetching maids:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to select a specific maid by ID
router.post('/select-maid/:id', async (req, res) => {
  try {
    const maidId = req.params;
    
    // Validate the ID format
    if (!ObjectId.isValid(maidId)) {
      return res.status(400).json({ message: 'Invalid maid ID format' });
    }

    const database = client.db('maidServiceDB');
    const maidsCollection = database.collection('maids');
    
    // Find the maid by ID
    const maid = await maidsCollection.findOne({ _id: new ObjectId(maidId) });
    
    if (!maid) {
      return res.status(404).json({ message: 'Maid not found' });
    }

    // Here you would typically add logic to associate the maid with a user
    // For example, add to user's selected maids or create a booking
    
    res.status(200).json({
      message: 'Maid selected successfully',
      maid: {
        id: maid._id,
        name: maid.fullName,
        specialties: maid.specialties,
        rating: maid.rating
      }
    });
  } catch (error) {
    console.error('Error selecting maid:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to filter maids by criteria
router.get('/maids/filter', async (req, res) => {
  try {
    const { cuisine, minRating, specialty } = req.query;
    const filter = {};

    if (cuisine) {
      filter.cuisine = { $in: Array.isArray(cuisine) ? cuisine : [cuisine] };
    }

    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    if (specialty) {
      filter.specialties = { $in: Array.isArray(specialty) ? specialty : [specialty] };
    }

    const database = client.db('maidServiceDB');
    const maidsCollection = database.collection('maids');
    
    const maids = await maidsCollection.find(filter).toArray();
    res.status(200).json(maids);
  } catch (error) {
    console.error('Error filtering maids:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;