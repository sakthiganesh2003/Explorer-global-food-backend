const Maid = require('../Models/formmaid'); // Adjust the path as necessary

const addformMaid = async (req, res) => {
  try {
    const maid = new Maid(req.body);
    await maid.save();
    res.status(201).json({ message: 'Maid added successfully', maid });
  } catch (error) {
    res.status(500).json({ message: 'Error adding maid', error });
  }
};

const getformMaids = async (req, res) => {
  try {
    const maids = await Maid.find();
    res.json(maids);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maids', error });
  }
};

module.exports = { addformMaid, getformMaids };
