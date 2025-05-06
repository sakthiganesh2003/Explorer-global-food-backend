const express = require("express");
const multer = require("multer");
const {
  createRefundRequest,
  fetchAllRefunds,
  updateRefundProof,
} = require("../../Controller/booking/refundcontroller");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.route("/").get(fetchAllRefunds).post(createRefundRequest);
router.patch("/proof/:id", upload.single("proof"), updateRefundProof);

module.exports = router;