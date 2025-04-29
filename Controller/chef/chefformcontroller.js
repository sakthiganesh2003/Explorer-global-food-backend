// Controller/chef/chefformcontroller.js
const Chef = require('../../Models/chef/chefform');
const { cloudinary } = require('../../Config/cloudinary');

exports.registerChef = async (req, res) => {
  try {
    // Handle file upload
    let certification = null;
    if (req.file) {
      certification = {
        public_id: req.file.public_id,
        url: req.file.path,
      };
    }

    // Create new chef
    const chef = new Chef({
      name: req.body.name,
      experienceYears: req.body.experienceYears,
      specialty: req.body.specialty,
      certification,
      agreeToTerms: req.body.agreeToTerms,
    });

    await chef.save();

    res.status(201).json({
      success: true,
      data: chef,
    });
  } catch (err) {
    // Delete uploaded file if error occurs
    if (req.file && req.file.public_id) {
      await cloudinary.uploader.destroy(req.file.public_id);
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }



};
exports.getAllChefs = async (req, res) => {
  try {
    const chefs = await Chef.find();
    res.status(200).json({
      success: true,
      data: chefs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
exports.deleteChef = async (req, res) => {
  try {
    const chefId = req.params.id;

    // Find the chef by ID
    const chef = await Chef.findByIdAndDelete(chefId);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    // Delete the che
    res.status(200).json({ success: true, message: 'Chef deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};