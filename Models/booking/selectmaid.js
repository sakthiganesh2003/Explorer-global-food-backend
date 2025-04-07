const mongoose = require('mongoose');

const maidSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please add a full name']
    },
    cuisine: {
        type: [String],
        default: []
    },
    specialties: {
        type: [String],
        required: [true, 'Please add at least one specialty']
    },
    rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating must not be more than 5'],
        default: 3
    },
    experience: {
        type: Number,
        required: [true, 'Please add years of experience']
    },
    image: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('selectMaid', maidSchema);