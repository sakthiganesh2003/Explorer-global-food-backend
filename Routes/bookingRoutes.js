const express = require("express");
const { getMaids, addMaid } = require("../Controller/Bookingcontroller");

const router = express.Router();

router.get("/maids", getMaids);
router.post("/maids", addMaid);

module.exports = router;
