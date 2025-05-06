const User = require('../../Models/user/userprofile'); // Adjust path to your model
const cloudinary = require('../../Config/cloudinary'); // Adjust path to your cloudinary config
const multer = require('multer');
const path = require('path');

// Multer setup (in-controller)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(new Error('Only JPG, JPEG, PNG allowed'), false);
    }
    cb(null, true);
  },
}).single('avatar');

// GET profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE profile with optional image
exports.updateUserProfile = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const { name, phone, address } = req.body;
      if (name) user.name = name;
      if (phone) user.phone = phone;
      if (address) user.address = address;

      if (req.file) {
        // Remove old avatar if exists
        if (user.avatarPublicId) {
          await cloudinary.uploader.destroy(user.avatarPublicId);
        }

        const streamUpload = (buffer) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: 'avatars' },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            stream.end(buffer);
          });
        };

        const result = await streamUpload(req.file.buffer);
        user.avatar = result.secure_url;
        user.avatarPublicId = result.public_id;
      }

      await user.save();
      res.json({ message: 'Profile updated', user });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};
