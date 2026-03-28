const { Refunds } = require("../../Models/booking/refund");
const Booking = require("../../Models/booking/bookingmodel");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");


dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const uploadImageToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "refunds" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(file.buffer);
  });
};

exports.fetchAllRefunds = async (req, res) => {
  try {
    const refunds = await Refunds.find()
      .populate({
        path: "bookingId",
        select: "amountRefunded status refundedAt createdAt userId",
        populate: {
          path: "userId",
          select: "name email role",
        },
      });

    res.status(200).json({ success: true, data: refunds });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    res.status(500).json({ success: false, error: "Failed to fetch refunds", details: error.message });
  }
};

exports.updateRefundProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminComment } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Proof image is required" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, error: "Only JPEG, PNG, or GIF images allowed" });
    }

    let cloudinaryUrl;
    try {
      cloudinaryUrl = await uploadImageToCloudinary(req.file);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Failed to upload proof image to Cloudinary",
        details: error.message,
      });
    }

    const refund = await Refunds.findById(id);
    if (!refund) {
      return res.status(404).json({ success: false, error: "Refund request not found" });
    }

    refund.proof = cloudinaryUrl;
    refund.adminComment = adminComment ? adminComment.replace(/[<>"'&]/g, "") : null;
    refund.status = "refunded";
    refund.updatedAt = new Date();
    await refund.save();

    const booking = await Booking.findById(refund.bookingId).populate("userId");
    if (!booking || !booking.userId) {
      return res.status(404).json({ success: false, error: "Booking or User not found" });
    }

    const user = booking.userId;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Refund Proof Submitted",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color: #007bff;">Refund Processed</h2>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>Your refund for booking ID <strong>${refund.bookingId}</strong> has been processed.</p>
          <div style="background: #f9f9f9; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            <p><strong>Admin Comment:</strong> ${refund.adminComment || 'None'}</p>
            <p><strong>Proof:</strong> <a href="${cloudinaryUrl}" target="_blank">View Image</a></p>
          </div>
          <p>Thank you for using TravelerConnect.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Failed to send email:", emailError.message);
    }

    return res.status(200).json({
      success: true,
      data: refund,
      message: "Refund proof submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting refund proof:", error);
    return res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message,
    });
  }
};

exports.createRefundRequest = async (req, res) => {
  const { bookingId, amount } = req.body;

  try {
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, error: "Invalid booking ID" });
    }

    const existingRefund = await Refunds.findOne({ bookingId });
    if (existingRefund) {
      return res.status(400).json({
        success: false,
        error: "Refund request already exists for this booking",
      });
    }

    const refund = await Refunds.create({ bookingId, amount });
    res.status(200).json({
      success: true,
      data: refund,
      message: "Refund request created successfully",
    });
  } catch (error) {
    console.error("Error creating refund request:", error);
    res.status(500).json({ success: false, error: "Error creating refund request" });
  }
};