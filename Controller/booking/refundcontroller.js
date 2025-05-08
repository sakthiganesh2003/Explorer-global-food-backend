const { Refunds } = require("../../Models/booking/refund");
const Razorpay = require("razorpay");
const Booking = require("../../Models/booking/bookingmodel");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || "undefined",
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    allowable: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const uploadImageToCloudinary = async (imagePath, retries = 5, initialDelay = 2000) => {
  // Re-apply configuration to ensure it’s set
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });


  // Log configuration for debugging
  console.log("Cloudinary Config:", {
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET ? "****" : undefined,
  });

  // Verify Cloudinary uploader is available
  if (!cloudinary.uploader) {
    throw new Error("Cloudinary uploader is not initialized");
  }

  // Verify file accessibility
  try {
    await fs.promises.access(imagePath, fs.constants.R_OK);
    console.log("File is accessible:", imagePath);
  } catch (error) {
    throw new Error(`File is not accessible: ${error.message}`);
  }

  try {
    const result = await cloudinary.v2.uploader.upload(imagePath, {
      folder: "refunds",
      timeout: 60000,
    });
    console.log("Cloudinary upload success:", result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", {
      message: error.message,
      stack: error.stack,
      retryCount: retries,
    });
    if (retries > 0) {
      const delay = initialDelay * (6 - retries);
      console.log(`Retrying Cloudinary upload... Attempts left: ${retries}, Delay: ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return uploadImageToCloudinary(imagePath, retries - 1, initialDelay);
    }
    throw new Error(`Cloudinary upload failed after ${retries + 1} attempts: ${error.message}`);
  }
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
    res.status(500).json({ success: false, error: "Failed to fetch refunds" });
  }
};

exports.createRefundRequest = async (req, res) => {
  const { bookingId, amount } = req.body;
  console.log("Create refund request:", { bookingId, amount });

  try {
    // Validate bookingId
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, error: "Invalid booking ID" });
    }

    // Check for existing refund using findOne
    const existingRefund = await Refunds.findOne({ bookingId });
    if (existingRefund) {
      return res.status(400).json({
        success: false,
        error: "Refund request already exists for this booking",
      });
    }

    // Create new refund
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

exports.updateRefundProof = async (req, res) => {
  try {
    const { id } = req.params;
    let { adminComment, proofBase64 } = req.body;

    let localFilePath;

    // 🖼️ Check if using base64 (raw JSON input)
    if (proofBase64) {
      const matches = proofBase64.match(/^data:(image\/(jpeg|png|gif));base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ success: false, error: "Invalid image format (must be Base64 JPEG/PNG/GIF)" });
      }

      const extension = matches[2];
      const imageData = matches[3];
      localFilePath = path.join(__dirname, `../Uploads/refund-${Date.now()}.${extension}`);
      fs.writeFileSync(localFilePath, Buffer.from(imageData, "base64"));
    }

    // 🖼️ Otherwise fallback to req.file (multipart form-data)
    else if (req.file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: "Only JPEG, PNG, or GIF images allowed" });
      }

      try {
        await fs.promises.access(req.file.path, fs.constants.R_OK);
      } catch (error) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: "Invalid or corrupted file" });
      }

      localFilePath = req.file.path;
    } else {
      return res.status(400).json({ success: false, error: "Proof image is required" });
    }

    // 🔐 Sanitize admin comment
    adminComment = (adminComment || "").replace(/[<>"'&]/g, "");

    // ☁️ Upload to Cloudinary
    let cloudinaryUrl;
    try {
      cloudinaryUrl = await uploadImageToCloudinary(localFilePath);
    } catch (error) {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return res.status(500).json({
        success: false,
        error: "Failed to upload proof image to Cloudinary",
        details: error.message,
      });
    }

    // 🧹 Delete local file
    fs.unlink(localFilePath, (err) => {
      if (err) console.error("Error deleting local file:", err);
    });

    // 🔄 Update refund record
    const refund = await Refunds.findById(id);
    if (!refund) {
      return res.status(404).json({ success: false, error: "Refund request not found" });
    }

    refund.proof = cloudinaryUrl;
    refund.adminComment = adminComment;
    refund.status = "refunded";
    refund.updatedAt = Date.now();
    await refund.save();

    // 📦 Get booking & user info
    const booking = await Booking.findById(refund.bookingId).populate("userId");
    if (!booking || !booking.userId) {
      return res.status(404).json({ success: false, error: "Booking or User not found" });
    }

    const user = booking.userId;

    // 📧 Send email
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
            <p><strong>Admin Comment:</strong> ${adminComment}</p>
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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message,
    });
  }
};