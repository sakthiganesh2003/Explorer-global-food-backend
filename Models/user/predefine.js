const mongoose = require('mongoose');
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

// Programming Skills Model
const ProgrammingSkillSchema = new Schema(
  {
    skillName: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // Kept foreign key, renamed
    // skillLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
    order: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);
const ProgrammingSkill = mongoose.model('ProgrammingSkill', ProgrammingSkillSchema);

module.exports = { Country, State, Category, ProgrammingSkill };