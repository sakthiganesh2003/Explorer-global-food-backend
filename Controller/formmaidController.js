const Maid = require('../Models/formmaid');

// Helper function for validation
const validateInputs = (data) => {
  const errors = [];
  
  if (!data.userId) errors.push('User ID is required');
  if (!data.fullName?.trim()) errors.push('Full name is required');
  if (!data.email?.trim()) errors.push('Email is required');
  if (!data.phone?.trim()) errors.push('Phone is required');
  if (!data.experience) errors.push('Experience is required');
  if (!data.specialties || (Array.isArray(data.specialties) && data.specialties.length === 0)) {
    errors.push('At least one specialty is required');
  }
  if (!data.bio?.trim()) errors.push('Bio is required');
  if (!data.aadhaarNumber?.trim()) errors.push('Aadhaar number is required');
  if (!data.aadhaarPhoto) errors.push('Aadhaar photo is required');
  if (!data.bankAccountNumber?.trim()) errors.push('Bank account number is required');
  if (!data.bankName?.trim()) errors.push('Bank name is required');
  if (!data.ifscCode?.trim()) errors.push('IFSC code is required');
  if (!data.accountHolderName?.trim()) errors.push('Account holder name is required');

  // Additional format validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  if (data.phone && !/^\d{10}$/.test(data.phone)) {
    errors.push('Phone number must be 10 digits');
  }
  if (data.aadhaarNumber && !/^\d{12}$/.test(data.aadhaarNumber)) {
    errors.push('Aadhaar number must be 12 digits');
  }
  if (data.bankAccountNumber && !/^\d{9,18}$/.test(data.bankAccountNumber)) {
    errors.push('Invalid bank account number (9-18 digits required)');
  }
  if (data.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode)) {
    errors.push('Invalid IFSC code format (e.g., ICIC0001359)');
  }
  
  return errors;
};

const addformMaid = async (req, res) => {
  console.log('Received maid application:', req.body);
  
  try {
    const { 
      userId,
      fullName, 
      email, 
      phone, 
      experience, 
      specialties, 
      bio, 
      aadhaarNumber,
      aadhaarPhoto,
      bankDetails
    } = req.body;

    const {
      accountNumber,
      bankName,
      ifscCode,
      accountHolderName
    } = bankDetails || {};

    // Validate inputs
    const validateInputs = (data) => {
      const errors = [];
      if (!data.userId) errors.push('User ID is required');
      if (!data.fullName?.trim()) errors.push('Full name is required');
      if (!data.email?.trim()) errors.push('Email is required');
      if (!data.phone?.trim()) errors.push('Phone is required');
      if (!data.experience) errors.push('Experience is required');
      if (!data.specialties || (Array.isArray(data.specialties) && data.specialties.length === 0)) {
        errors.push('At least one specialty is required');
      }
      if (!data.bio?.trim()) errors.push('Bio is required');
      if (!data.aadhaarNumber?.trim()) errors.push('Aadhaar number is required');
      if (!data.aadhaarPhoto) errors.push('Aadhaar photo is required');
      if (!data.bankDetails?.accountNumber?.trim()) errors.push('Bank account number is required');
      if (!data.bankDetails?.bankName?.trim()) errors.push('Bank name is required');
      if (!data.bankDetails?.ifscCode?.trim()) errors.push('IFSC code is required');
      if (!data.bankDetails?.accountHolderName?.trim()) errors.push('Account holder name is required');

      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email format');
      }
      if (data.phone && !/^\d{10}$/.test(data.phone)) {
        errors.push('Phone number must be 10 digits');
      }
      if (data.aadhaarNumber && !/^\d{12}$/.test(data.aadhaarNumber)) {
        errors.push('Aadhaar number must be 12 digits');
      }
      if (data.bankDetails?.accountNumber && !/^\d{9,18}$/.test(data.bankDetails.accountNumber)) {
        errors.push('Invalid bank account number (9-18 digits required)');
      }
      if (data.bankDetails?.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.bankDetails.ifscCode)) {
        errors.push('Invalid IFSC code format (e.g., ICIC0001359)');
      }
      
      return errors;
    };

    const validationErrors = validateInputs(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors 
      });
    }

    // Process specialties
    let specialtiesArray = specialties;
    if (typeof specialties === 'string') {
      specialtiesArray = specialties.split(',').map(s => s.trim());
    } else if (!Array.isArray(specialties)) {
      specialtiesArray = [];
    }

    // Check for existing maid
    const existingMaid = await Maid.findOne({ 
      $or: [{ email }, { phone }, { aadhaarNumber }] 
    }).collation({ locale: 'en', strength: 2 });

    if (existingMaid) {
      return res.status(409).json({ 
        success: false,
        message: 'Maid with this email, phone, or Aadhaar number already exists',
        existingId: existingMaid._id
      });
    }

    // Create new maid
    const maid = new Maid({
      userId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      experience,
      specialties: specialtiesArray,
      bio: bio.trim(),
      aadhaarPhoto,
      aadhaarNumber: aadhaarNumber.trim(),
      bankDetails: {
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        accountHolderName: accountHolderName.trim()
      },
      status: 'pending',
      createdAt: new Date()
    });

    const savedMaid = await maid.save();
    
    console.log('Maid application saved successfully:', savedMaid._id);
    
    return res.status(201).json({ 
      success: true,
      message: 'Maid application submitted successfully',
      data: {
        id: savedMaid._id,
        name: savedMaid.fullName,
        email: savedMaid.email,
        status: savedMaid.status
      }
    });

  } catch (error) {
    console.error('Error adding maid:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
const getformMaids = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    
    const maids = await Maid.find(query)
      .select('-__v -bankDetails')
      .sort({ createdAt: -1 }) // Changed from registrationDate to createdAt
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const count = await Maid.countDocuments(query);

    return res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / Number(limit)),
      currentPage: Number(page),
      data: maids
    });
  } catch (error) {
    console.error('Error fetching maids:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateStatusMaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ 
        success: false,
        message: 'ID and status are required' 
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updatedMaid = await Maid.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updatedMaid) {
      return res.status(404).json({ 
        success: false,
        message: 'Maid not found' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Maid status updated successfully',
      data: updatedMaid
    });
  } catch (error) {
    console.error('Error updating maid status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { 
  addformMaid, 
  getformMaids,
  updateStatusMaid 
};