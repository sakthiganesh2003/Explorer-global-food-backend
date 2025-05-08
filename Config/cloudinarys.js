// Config/cloudinarys.js
const cloudinary = require('cloudinary').v2;

// Log environment variables for debugging
console.log('Cloudinary env vars (cloudinarys):', {
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate Cloudinary environment variables
const requiredEnvVars = ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing Cloudinary environment variables:', missingEnvVars);
  throw new Error(`Missing required Cloudinary environment variables: ${missingEnvVars.join(', ')}`);
}

// Configure Cloudinary
const config = {
  cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
  api_key:process.env.CLOUDINARY_API_KEY,
  api_secret:process.env.CLOUDINARY_API_SECRET,
};
cloudinary.config(config);

// Log Cloudinary configuration to confirm
console.log('Cloudinary config applied (cloudinarys):', {
  cloud_name: cloudinary.config().cloud_name,
  api_key: cloudinary.config().api_key,
  api_secret: cloudinary.config().api_secret ? '[REDACTED]' : undefined,
});

// Verify configuration
if (!cloudinary.config().cloud_name) {
  console.error('Cloudinary configuration failed: cloud_name is not set');
  throw new Error('Cloudinary configuration failed: cloud_name is not set');
}

module.exports = cloudinary;