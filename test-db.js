const mongoose = require('mongoose');
require('dotenv').config();

const testDB = async () => {
  try {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in Database:');
    for (let col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }

    // Try to find a "test" collection or similar
    const testCollection = collections.find(c => c.name.toLowerCase().includes('test'));
    if (testCollection) {
      console.log(`\nData from ${testCollection.name}:`);
      const data = await mongoose.connection.db.collection(testCollection.name).find().limit(5).toArray();
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('\nNo collection containing "test" was found.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ MongoDB Test Error:', err);
  }
};

testDB();
