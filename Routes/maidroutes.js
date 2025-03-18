const express = require("express");
const { getMaids, addMaid } = require("../Controller/maidController");

const router = express.Router();

router.get("/maids", getMaids);
router.post("/", addMaid);

module.exports = router;
