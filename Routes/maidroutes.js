const express = require("express");
const { getMaids, addMaid, getCuisines, addCuisine, toggleMaidStatus } = require("../Controller/maidController");

const router = express.Router();

router.get("/maids", getMaids);
router.patch("/maids/:id", toggleMaidStatus);
//router.post("/", addMaid);

router.get("/", getCuisines);
router.post("/cusines", addCuisine);


module.exports = router;
