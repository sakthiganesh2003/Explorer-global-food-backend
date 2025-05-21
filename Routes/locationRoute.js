
const express = require("express");
const { createLocation, getLocations, updateLocation, deleteLocation } = require('../Controller/LocationController')
const router = express.Router()

router.route('/').get(getLocations).post(createLocation)
router.route('/:id').put(updateLocation).delete(deleteLocation)

module.exports = router;