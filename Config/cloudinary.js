const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Configure Multer for temporary disk storage
  const upload = multer({
    storage: multer.diskStorage({}), // Temporary storage
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
      // Allow JPG, JPEG, PNG, and PDF files
      if (!file.mimetype.match(/image\/(jpg|jpeg|png)|application\/pdf/)) {
        return cb(new Error('Only JPG, PNG, or PDF files are allowed'));
      }
      cb(null, true);
    },
  });

  module.exports = { cloudinary, upload };
} catch (error) {
  console.error('Cloudinary configuration error:', error);
  throw new Error('Failed to configure Cloudinary');
}