const express = require("express");
const multer = require("multer");
const { 
    signup, 
    login, 
    forgotPassword, 
    verifyResetCode, 
    resetPassword, 
    verifyEmail, 
    resendVerificationEmail,
    
    
    uploadGovernmentIdAndBecomeInstructor,
    
    signupMaid,
    maidLogin,
    
    verifyMaidEmail
} = require("../Controller/Authcontroller");
const Guide = require("../Models/instructor");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(), // Store files in memory (or use diskStorage if preferred)
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit, matching your frontend validation
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPG, PNG, or PDF files are allowed"));
        }
        cb(null, true);
    },
});

// Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/maid/signup", signupMaid);
router.post("/maid/login", maidLogin);
router.post("/resendverification", resendVerificationEmail);
router.get("/verify-email/:token", verifyEmail);
// Use multer middleware for file upload
router.post("/verifyId", upload.single("governmentId"), uploadGovernmentIdAndBecomeInstructor);
router.get("/verify-maid-email/:token", verifyMaidEmail);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

module.exports = router;