import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Country Model
const CountrySchema = new Schema(
  {
    name: { type: String, required: true },
    order: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);
const Country = mongoose.model('Country', CountrySchema);

// State Model
const StateSchema = new Schema(
  {
    name: { type: String, required: true },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true }, // Added foreign key
    order: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);
const State = mongoose.model('State', StateSchema);

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true, // Ensures city names are globally unique
  },
  order: {
    type: Number,
    required: true,
    min: 1,
  },
});

const City = mongoose.model('City', citySchema);

// Category Model
const CategorySchema = new Schema(
  {
    name: { type: String, required: true }, // Replaced courseId, skillId
    // type: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true }, // Replaced type foreign key with enum
    order: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);
const Category = mongoose.model('Category', CategorySchema);



export { Country, State, Category, City };