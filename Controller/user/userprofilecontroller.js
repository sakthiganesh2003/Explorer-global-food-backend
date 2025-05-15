const StudentProfile = require('../../Models/user/userprofile');
const State = require('../../Models/user/predefine').State;
const cloudinary = require("cloudinary").v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Uploaded file must be an image'), false);
    }
    cb(null, true);
  },
}).single('avatar');

// Middleware to handle Multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Uploaded file is too large (max 50MB)' });
    }
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  if (err.message === 'Uploaded file must be an image') {
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

const createStudentProfile = async (req, res) => {
  try {
    const { userId, fullName, bio, learningGoals, preferredLearningStyle, countryId, stateId, seoProjects, preferredAITools, contentOptimizationPrefs, avatarUrl } = req.body;

    // Validate existing profile
    const existingProfile = await StudentProfile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).json({ message: 'Student profile already exists' });
    }

    // Validate state belongs to country
    const state = await State.findById(stateId);
    if (!state || state.countryId.toString() !== countryId) {
      return res.status(400).json({ message: 'Invalid state or state does not belong to the specified country' });
    }

    // Handle avatar: use file upload if provided, otherwise use avatarUrl
    let finalAvatarUrl = avatarUrl;
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            folder: 'student_profiles',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      finalAvatarUrl = result.secure_url;
    }

    // Ensure an avatar URL is provided
    if (!finalAvatarUrl) {
      return res.status(400).json({ message: 'Avatar URL or image file is required' });
    }

    const profile = new StudentProfile({
      userId,
      fullName,
      bio,
      avatarUrl: finalAvatarUrl,
      learningGoals,
      preferredLearningStyle,
      countryId,
      stateId,
      seoProjects: seoProjects || [],
      preferredAITools: preferredAITools || [],
      contentOptimizationPrefs: contentOptimizationPrefs || 'Blog Posts',
    });

    await profile.save();
    res.status(201).json({ message: 'Student profile created successfully', profile });
  } catch (error) {
    res.status(500).json({ message: 'Error creating student profile', error: error.message });
  }
};

const getStudentProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    res.status(200).json({ message: 'Student profile fetched successfully', profile });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student profile', error: error.message });
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedAt = Date.now();

    const profile = await StudentProfile.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    res.status(200).json({ message: 'Student profile updated successfully', profile });
  } catch (error) {
    res.status(500).json({ message: 'Error updating student profile', error: error.message });
  }
};

const deleteStudentProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findByIdAndDelete(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    res.status(200).json({ message: 'Student profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student profile', error: error.message });
  }
};

const getStudentProfileByUserId = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.params.userId });
    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    res.status(200).json({ message: 'Student profile fetched successfully', profile });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student profile', error: error.message });
  }
};

const updateStudentProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, bio, learningGoals, preferredLearningStyle, countryId, stateId, seoProjects, preferredAITools, contentOptimizationPrefs, avatarUrl } = req.body;

    // Parse seoProjects and preferredAITools if they are strings
    let parsedSeoProjects = seoProjects;
    let parsedPreferredAITools = preferredAITools;

    if (typeof seoProjects === 'string') {
      try {
        parsedSeoProjects = JSON.parse(seoProjects);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid format for seoProjects. Expected an array of objects.' });
      }
    }

    if (typeof preferredAITools === 'string') {
      try {
        parsedPreferredAITools = JSON.parse(preferredAITools);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid format for preferredAITools. Expected an array of strings.' });
      }
    }

    // Validate parsed data types
    if (!Array.isArray(parsedSeoProjects)) {
      return res.status(400).json({ message: 'seoProjects must be an array of objects.' });
    }
    if (!Array.isArray(parsedPreferredAITools) || !parsedPreferredAITools.every(item => typeof item === 'string')) {
      return res.status(400).json({ message: 'preferredAITools must be an array of strings.' });
    }

    // Prepare updates
    const updates = {
      fullName,
      bio,
      learningGoals,
      preferredLearningStyle,
      countryId,
      stateId,
      seoProjects: parsedSeoProjects,
      preferredAITools: parsedPreferredAITools,
      contentOptimizationPrefs,
      updatedAt: Date.now(),
    };

    // Debug: Log received IDs (as per your request, avoiding country and state details)
    console.log('Received IDs:', { types: { countryId: typeof countryId, stateId: typeof stateId } });

    // Validate state belongs to country (avoiding showing country and state details)
    const state = await State.findById(stateId);
    if (!state) {
      console.log('State not found for stateId');
      return res.status(400).json({ message: 'Invalid state ID' });
    }
    const stateCountryId = state.countryId.toString();
    const receivedCountryId = countryId.toString();
    if (stateCountryId !== receivedCountryId) {
      console.log('Country mismatch');
      return res.status(400).json({ message: 'State does not belong to the specified country' });
    }

    // Handle avatar: use file upload if provided, otherwise use avatarUrl
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            folder: 'student_profiles',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      updates.avatarUrl = result.secure_url;
    } else if (avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    res.status(200).json({ message: 'Student profile updated successfully', profile });
  } catch (error) {
    console.error('Update error:', error);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    res.status(500).json({ message: 'Error updating student profile', error: error.message });
  }
};

// Export with Multer middleware for routes that handle file uploads
module.exports = {
  createStudentProfile: [upload, handleMulterError, createStudentProfile],
  getStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
  getStudentProfileByUserId,
  updateStudentProfileByUserId: [upload, handleMulterError, updateStudentProfileByUserId],
};