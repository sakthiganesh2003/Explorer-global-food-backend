const express = require('express');
const router = express.Router();
const selectMaidController = require('../../Controller/booking/selectmaidcontroller');
const authMiddleware = require('../../middleware/authMiddleware');
// const { check } = require('express-validator');

// Public routes
router.get('/maids', selectMaidController.getAvailableMaids);

// Protected routes
router.post('/select-maid', 
  [
    authMiddleware.authenticate,
    check('maidId', 'Maid ID is required').notEmpty(),
    check('memberId', 'Member ID is required').notEmpty(),
    check('timeSlot', 'Time slot is required').notEmpty(),
    check('services', 'At least one service is required').isArray({ min: 1 })
  ],
  selectMaidController.selectMaid
);

module.exports = router;