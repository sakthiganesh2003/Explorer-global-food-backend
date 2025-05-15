const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    validate: {
      validator: async function (value) {
        const user = await mongoose.model('User').findById(value);
        return user && user.role === 'user';
      },
      message: 'User must have the role of student'
    }
  },
  fullName: { 
    type: String, 
    maxlength: 100, 
    required: true 
  },
  bio: { 
    type: String, 
    maxlength: 500 
  },
  avatarUrl: { 
  type: String,
  required: [true, 'Avatar URL is required'],
  validate: {
    validator: function (value) {
      // Use a more permissive regex for URLs
      return /^(https?:\/\/)([\da-z.-]+\.)+[a-z]{2,6}(\/[\w\/.-]*)*(\?[\w=&-]*)?$/.test(value);
    },
    message: 'Avatar URL must be a valid URL'
  }
},
  seoProjects: [{
    projectName: { type: String, required: true, maxlength: 100 },
    targetKeywords: [{ type: String, maxlength: 50 }],
    status: { 
      type: String, 
      enum: ['Planning', 'Active', 'Completed'], 
      default: 'Planning' 
    }
  }],
  preferredAITools: [{ 
    type: String, 
    enum: ['Content Generator', 'Competitor Analyzer', 'Backlink Builder', 'Content Optimizer', 'Infographic Creator'], 
    default: 'Content Generator' 
  }],
  contentOptimizationPrefs: { 
    type: String, 
    enum: ['Blog Posts', 'Infographics', 'Social Media', 'Featured Images'], 
    default: 'Blog Posts' 
  },
  learningGoals: { 
    type: String, 
    maxlength: 300 
  },
  preferredLearningStyle: { 
    type: String, 
    enum: ['Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing'], 
    default: 'Visual' 
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  stateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update updatedAt timestamp on save
studentProfileSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);