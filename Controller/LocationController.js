const Location = require('../Models/Location'); // Adjust path as needed

// Create a new location
exports.createLocation = async (req, res) => {
    try {
        const { cityName,pincode} = req.body
        const location = await Location.create({
            cityName,
            pincode
        })
        await location.save();
        res.status(201).json(location);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get all locations
exports.getLocations = async (req, res) => {
    try {
        const locations = await Location.find();
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get a single location by ID
exports.getLocationById = async (req, res) => {
    try {

        const location = await Location.findById(req.params.id);
        if (!location) return res.status(404).json({ error: 'Location not found' });
        res.json(location);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update a location by ID
exports.updateLocation = async (req, res) => {
    try {
        const location = await Location.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!location) return res.status(404).json({ error: 'Location not found' });
        res.json(location);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete a location by ID
exports.deleteLocation = async (req, res) => {
    try {
        const location = await Location.findByIdAndDelete(req.params.id);
        if (!location) return res.status(404).json({ error: 'Location not found' });
        res.json({ message: 'Location deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};