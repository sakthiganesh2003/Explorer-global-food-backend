const mongoose = require('mongoose');
const Food = require('./models/Food');
require('dotenv').config();

const foods = [
  { 
    name: "Pasta", 
    cuisine: "Italian",
    price: 250,
    image: "/italian.jpg"
  },
  { 
    name: "Pizza", 
    cuisine: "Italian",
    price: 300,
    image: "/italian.jpg"
  },
  { 
    name: "Dim Sum", 
    cuisine: "Chinese",
    price: 180,
    image: "/chinese.jpg"
  },
  { 
    name: "Noodles", 
    cuisine: "Chinese",
    price: 200,
    image: "/chinese.jpg"
  },
  { 
    name: "Tacos", 
    cuisine: "Mexican",
    price: 150,
    image: "/mexican.jpg"
  },
  { 
    name: "Burritos", 
    cuisine: "Mexican",
    price: 220,
    image: "/mexican.jpg"
  },
  { 
    name: "Curry", 
    cuisine: "Indian",
    price: 180,
    image: "/indian.jpg"
  },
  { 
    name: "Biryani", 
    cuisine: "Indian",
    price: 220,
    image: "/indian.jpg"
  }
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-ordering')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await Food.deleteMany({});
    
    // Insert new data
    await Food.insertMany(foods);
    
    console.log('Database seeded successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database seeding error:', err);
    process.exit(1);
  });