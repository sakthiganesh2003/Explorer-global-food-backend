const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
    cityName: {
        type: String,
        required: true,
        trim: true
    },
    pincode: {
        type: String,
        required: true,
        trim: true
    }
});

module.exports = mongoose.model('Location', LocationSchema);