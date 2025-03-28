const express = require("express");
const { getMaids, addMaid, getCuisines, addCuisine } = require("../Controller/maidController");

const router = express.Router();

router.get("/maids", getMaids);
//router.post("/", addMaid);

router.get("/", getCuisines);
router.post("/cusines", addCuisine);


module.exports = router;
