const { Country, State, Category, City } = require('../../Models/user/predefine');
const mongoose = require('mongoose');
// const Course = require('../../Models/user/course');

// Create Country
exports.createCountry = async (req, res) => {
  try {
    const { name, order } = req.body;
    if (!name || !order) {
      return res.status(400).json({ error: 'Name and order are required' });
    }
    const country = new Country({ name, order });
    await country.save();
    res.status(201).json(country);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create State
exports.createState = async (req, res) => {
  try {
    const { name, countryId, order } = req.body;
    if (!name || !countryId || !order) {
      return res.status(400).json({ error: 'Name, countryId, and order are required' });
    }
    // Validate countryId
    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(400).json({ error: 'Invalid countryId' });
    }
    const state = new State({ name, countryId, order });
    await state.save();
    res.status(201).json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.createtheCitys = async (req, res) => {
  try {
    const { name, order } = req.body;

    // Validate input
    if (!name || !order) {
      return res.status(400).json({ error: 'Name and order are required' });
    }

    // Check if city already exists
    const existingCity = await City.findOne({ name });
    if (existingCity) {
      return res.status(400).json({ error: 'City already exists' });
    }

    // Create and save the city
    const city = new City({ name, order });
    await city.save();

    res.status(201).json(city);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getallcity = async(req , res)=>{
 
};

// Get States by Country ID
exports.getStatesByCountryId = async (req, res) => {
  try {
    const { countryId } = req.params;
    // Validate countryId
    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    const states = await State.find({ countryId }).lean();
    res.status(200).json({ states });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Create Category
exports.createCategory = async (req, res) => {
  try {
    const { name, order } = req.body;
    if (!name || !order) {
      return res.status(400).json({ error: 'Name, type, and order are required' });
    }
    const category = new Category({ name, order });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// Get all Countries
exports.getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find().lean();
    res.status(200).json(countries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all States
exports.getAllStates = async (req, res) => {
  try {
    const states = await State.find().populate('countryId').lean();
    res.status(200).json(states);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all Categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().lean();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all Programming Skills
exports.getAllProgrammingSkills = async (req, res) => {
  try {
    const programmingSkills = await ProgrammingSkill.find().populate('categoryId').lean();
    res.status(200).json(programmingSkills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Country
exports.updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order } = req.body;
    if (!name || !order) {
      return res.status(400).json({ error: 'Name and order are required' });
    }
    const country = await Country.findByIdAndUpdate(id, { name, order }, { new: true });
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json(country);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update State
exports.updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, countryId, order } = req.body;
    if (!name || !countryId || !order) {
      return res.status(400).json({ error: 'Name, countryId, and order are required' });
    }
    // Validate countryId
    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(400).json({ error: 'Invalid countryId' });
    }
    const state = await State.findByIdAndUpdate(id, { name, countryId, order }, { new: true });
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }
    res.status(200).json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order } = req.body;
    if (!name || !order) {
      return res.status(400).json({ error: "Name and order are required" });
    }
    const category = await Category.findByIdAndUpdate(id, { name, order }, { new: true });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Programming Skill
exports.updateProgrammingSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skillName, categoryId, order } = req.body;
    if (!skillName || !categoryId || !order) {
      return res.status(400).json({ error: "SkillName, categoryId, and order are required" });
    }
    // Validate categoryId
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ error: "Invalid categoryId" });
    }
    const programmingSkill = await ProgrammingSkill.findByIdAndUpdate(
      id,
      { skillName, categoryId, order },
      { new: true }
    );
    if (!programmingSkill) {
      return res.status(404).json({ message: "Programming Skill not found" });
    }
    res.status(200).json(programmingSkill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Country
exports.deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await Country.findByIdAndDelete(id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    // Optionally delete related states
    await State.deleteMany({ countryId: id });
    res.status(200).json({ message: 'Country deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete State
exports.deleteState = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await State.findByIdAndDelete(id);
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }
    res.status(200).json({ message: 'State deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Check if the category is referenced by any courses
    const courseCount = await Course.countDocuments({ category: id }).session(session);
    if (courseCount > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "Cannot delete category because it is referenced by one or more courses",
      });
    }

    const category = await Category.findByIdAndDelete(id).session(session);
    if (!category) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete related programming skills
    await ProgrammingSkill.deleteMany({ categoryId: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};

// Delete Programming Skill
exports.deleteProgrammingSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const programmingSkill = await ProgrammingSkill.findByIdAndDelete(id);
    if (!programmingSkill) {
      return res.status(404).json({ message: 'Programming Skill not found' });
    }
    res.status(200).json({ message: 'Programming Skill deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};