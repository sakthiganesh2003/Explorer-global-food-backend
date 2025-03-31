const Maid = require('../Models/formmaid');

const addformMaid = async (req, res) => {
  console.log(req.body)
  try {
    const { 
      fullName, 
      email, 
      phone, 
      experience, 
      specialties, 
      bio, 
      aadhaarNumber,
      aadhaarPhoto,
      bankAccountNumber,
      bankName,
      ifscCode,
      accountHolderName
    } = req.body;


    // Validate bank details
    if (!bankAccountNumber || !bankName || !ifscCode || !accountHolderName) {
      return res.status(400).json({ message: 'All bank details are required' });
    }

    if (!/^\d{9,18}$/.test(bankAccountNumber)) {
      return res.status(400).json({ message: 'Invalid bank account number' });
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return res.status(400).json({ message: 'Invalid IFSC code format' });
    }

    const maid = new Maid({
      fullName,
      email,
      phone,
      experience,
      specialties: specialties ? specialties.split(',') : [],
      bio,
      aadhaarPhoto,
      aadhaarNumber,
      bankDetails: {
        accountNumber: bankAccountNumber,
        bankName,
        ifscCode,
        accountHolderName
      }
    });
    console.log('Maid application:', maid);
    await maid.save();
    res.status(201).json({ 
      success: true,
      message: 'Maid application submitted successfully',
      data: maid
    });
  } catch (error) {
    console.error('Error adding maid:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing application',
      error: error.message 
    });
  }
};

const getformMaids = async (req, res) => {
  try {
    const maids = await Maid.find().select('-__v');
    res.status(200).json({
      success: true,
      count: maids.length,
      data: maids
    });
  } catch (error) {
    console.error('Error fetching maids:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching maid applications',
      error: error.message
    });
  }
};

const updateStatusMaid = async(req,res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting status to be passed in the request body

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const updatedMaid = await Maid.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedMaid) {
      return res.status(404).json({ message: 'Maid not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Maid status updated successfully',
      data: updatedMaid
    });
  } catch (error) {
    console.error('Error updating maid status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating maid status',
      error: error.message
    });
  }
}

module.exports = { addformMaid, getformMaids,updateStatusMaid };