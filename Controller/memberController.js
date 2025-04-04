const Member = require('../Models/member'); // Adjust the path as necessary

exports.getMembers = async (req, res) => {
  try {
    const members = await Member.find();
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching members' });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { dietaryPreference, allergies, specialRequests, mealQuantity } = req.body;
    
    const newMember = new Member({
       // Make sure this is populated
      dietaryPreference,
      allergies: allergies || '',
      specialRequests: specialRequests || '',
      mealQuantity: mealQuantity || 1
    });

    const savedMember = await newMember.save();
    res.status(201).json(savedMember);
  } catch (error) {
    console.error('Error adding member:', error); // Add this line
    res.status(400).json({ 
      message: 'Error adding member',
      error: error.message // Include the error message in the response
    });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    await Member.findByIdAndDelete(id);
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting member' });
  }
};