const express = require("express");
const multer = require("multer");
const {
  fetchAllRefunds,
  updateRefundProof,
  createRefundRequest,
} = require("../../Controller/booking/refundcontroller");
const { create } = require("../../Models/Users");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.route("/").get(fetchAllRefunds).post(createRefundRequest)
router.patch("/proof/:id", upload.single("proof"), updateRefundProof);

module.exports = router;