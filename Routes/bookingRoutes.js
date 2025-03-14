import express from "express";
import { getMaids, addMaid } from "../Controller/bookingController.js";

const router = express.Router();

router.get("/maids", getMaids);
router.post("/maids", addMaid);

export default router;
