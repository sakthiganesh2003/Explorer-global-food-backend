const express = require('express');
const { addformMaid, getformMaids } = require('../Controller/formmaidController');


const router = express.Router();

router.post('/', addformMaid);
router.get('/', getformMaids);

module.exports = router;
