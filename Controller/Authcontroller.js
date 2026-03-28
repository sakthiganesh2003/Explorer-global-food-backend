const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../Models/Users");
const ResetPassword = require("../Models/ResetPassword");
const { emailVerificationTemplate } = require("../utils/emailTemplate");
const UserProfile = require("../Models/userprofile");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Guide = require("../Models/instructor");
const cloudinary = require("../helpers/cloudinary");

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (JPEG/JPG/PNG) and PDFs are allowed'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadGovernmentIdAndBecomeInstructor = async (req, res) => {
    try {
        // 1. Validate request contains file
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'No file uploaded' 
            });
        }

        const governmentIdFile = req.file;
        const userId = req.body.userId; // Should come from authenticated user

        // 2. Validate file type and size
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(governmentIdFile.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Only JPG, PNG, or PDF files are allowed'
            });
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (governmentIdFile.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: 'File size must be less than 5MB'
            });
        }

        // 3. Upload to Cloudinary using buffer
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'government_ids',
                    resource_type: 'auto',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
                    transformation: [
                        { quality: 'auto:best' },
                        { flags: 'attachment' }
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(governmentIdFile.buffer); // Pass the buffer to the stream
        });

        // 4. Update database records
        const [updatedGuide, updatedUser] = await Promise.all([
            Guide.findOneAndUpdate(
                { userId },
                {
                    aadharCardPhoto: {
                        public_id: uploadResult.public_id,
                        url: uploadResult.url,
                        secure_url: uploadResult.secure_url,
                        uploadedAt: new Date()
                    },
                    verificationStatus: 'pending'
                },
                { new: true, upsert: true }
            ),
            User.findByIdAndUpdate(
                userId,
                {
                    $set: { role: 'instructor' },
                    $push: {
                        roleHistory: {
                            role: 'instructor',
                            changedAt: new Date(),
                            changedBy: 'system',
                            reason: 'Government ID uploaded'
                        }
                    }
                },
                { new: true }
            )
        ]);

        // 5. Send success response
        return res.status(200).json({
            success: true,
            message: 'Government ID uploaded and guide role activated',
            data: {
                guide: updatedGuide,
                user: {
                    _id: updatedUser._id,
                    name: updatedUser.name,
                    role: updatedUser.role
                },
                document: {
                    url: uploadResult.secure_url,
                    uploadedAt: new Date()
                }
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const verifiedResetSessions = new Map();

const signup = async (req, res) => {
    try {
        console.log("✅ Received Data:", req.body);
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: "User with this email already exists" });

        const existingName = await User.findOne({ name });
        if (existingName) return res.status(400).json({ 
            info: "This name is already taken. Please choose a different name.",
            isNameTaken: true 
        });

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 1 day expiration

        const newUser = new User({
            name, 
            email, 
            password: hashedPassword, 
            isVerified: false, 
            verificationToken,
            verificationTokenExpires, 
            role: "user", // Default role
        });
        await newUser.save();

        console.log("New User Created:", { email, verificationToken, verificationTokenExpires });

        const token = jwt.sign(
            { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User registered successfully. Please verify your email.",
            token, 
            user: { id: newUser._id, name: newUser.name, role: newUser.role }
        });

        const verificationUrl = `${process.env.FRONTEND_URL}/Verify/${verificationToken}`;
        console.log("Verification URL:", verificationUrl);

        await transporter.sendMail({
            from: `"Global food explore" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email - Global food explore",
            html: emailVerificationTemplate(verificationUrl),
        });

    } catch (error) {
        console.error("❌ Signup Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// maid signup
const signupMaid = async (req, res) => {
    try {
        console.log("✅ Received maid Data:", req.body);
        const { name, email, password } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if email or name already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: "User with this email already exists" });

        const existingName = await User.findOne({ name });
        if (existingName) return res.status(400).json({ 
            info: "This name is already taken. Please choose a different name.",
            isNameTaken: true 
        });

        // Hash the password and create a verification token
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");

        // Create new Instructor user
        const newMaid = new User({
            name,
            email,
            password: hashedPassword,
            isVerified: false,
            verificationToken,
            role: "maid", // Assigning instructor role
        });

        await newMaid.save();

        // Generate a JWT token
        const token = jwt.sign(
            { id: newMaid._id, name: newMaid.name, email: newMaid.email, role: newMaid.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Maid registered successfully. Please verify your email and wait for admin approval.",
            token,
            user: { id: newMaid._id, name: newMaid.name, role: newMaid.role }
        });

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL}/maid/maid-verify/${verificationToken}`;
        await transporter.sendMail({
            from: `global food explore <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email - global food explore",
            html: emailVerificationTemplate(verificationUrl),
        });

    } catch (error) {
        console.error("❌ Signup Instructor Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


//chef signup
const signupChef = async (req, res) => {
    try {
        console.log("✅ Received Chef Data:", req.body);
        const { name, email, password } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if email or name already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: "User with this email already exists" });

        const existingName = await User.findOne({ name });
        if (existingName) return res.status(400).json({ 
            info: "This name is already taken. Please choose a different name.",
            isNameTaken: true 
        });

        // Hash the password and create a verification token
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");

        // Create new Chef user
        const newChef = new User({
            name,
            email,
            password: hashedPassword,
            isVerified: false,
            verificationToken,
            role: "chef", // Assigning chef role
        });

        await newChef.save();

        // Generate a JWT token
        const token = jwt.sign(
            { id: newChef._id, name: newChef.name, email: newChef.email, role: newChef.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Chef registered successfully. Please verify your email and wait for admin approval.",
            token,
            user: { id: newChef._id, name: newChef.name, role: newChef.role }
        });

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL}/chef/chef-verify/${verificationToken}`;
        await transporter.sendMail({
            from: `global food explore <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email - global food explore",
            html: emailVerificationTemplate(verificationUrl),
        });

    } catch (error) {
        console.error("❌ Signup Chef Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.isVerified) {
            return res.status(400).json({ message: "Email is already verified" });
        }

        const newVerificationToken = crypto.randomBytes(32).toString("hex");
        user.verificationToken = newVerificationToken;
        await user.save();

        const verificationUrl = `${process.env.FRONTEND_URL}/Verify/${newVerificationToken}`;

        await transporter.sendMail({
            from: `Global food explore <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email - Smart Learning Hub",
            html: emailVerificationTemplate(verificationUrl),
        });

        res.status(200).json({ message: "Verification email sent successfully." });
    } catch (error) {
        console.error("❌ Resend Verification Error:", error);
        res.status(500).json({
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Please enter a valid email and password" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (user.role !== 'admin' && user.role !== 'user') {
            return res.status(403).json({ error: "Access denied. Invalid user role." });
        }

        if (!user.isVerified) {
            return res.status(401).json({ error: "Please verify your email before logging in" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const userProfile = await UserProfile.findOne({ userId: user._id });

        const token = jwt.sign(
            { id: user._id.toString(), name: user.name, role: user.role, phone: userProfile?.phoneNumber || null, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            message: "Login successful",
            user: {
                _id: user._id,
                name: user.name,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const maidLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Please enter a valid email and password" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check if the role is 'instructor'
        if (user.role !== 'maid') {
            return res.status(403).json({ error: "Access denied. Only maid can log in from this route." });
        }

        if (!user.isVerified) {
            return res.status(401).json({ error: "Please verify your email before logging in" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id.toString(), name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            message: "maid login successful",
            user: { _id: user._id, name: user.name, role: user.role },
            token,
        });
    } catch (error) {
        console.error("❌ maid Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const chefLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Please enter a valid email and password" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check if the role is 'chef'
        if (user.role !== 'chef') {
            return res.status(403).json({ error: "Access denied. Only chefs can log in from this route." });
        }

        if (!user.isVerified) {
            return res.status(401).json({ error: "Please verify your email before logging in" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id.toString(), name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            message: "Chef login successful",
            user: { _id: user._id, name: user.name, role: user.role },
            token,
        });
    } catch (error) {
        console.error("❌ Chef Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() } // Check if token is still valid
            });
            console.log("User found:", user);
        console.log("Token from URL:", token);
        console.log("User found:", user ? user.email : "No user", user?.verificationToken);

        if (!user) return res.status(400).json({ message: "Invalid or expired token" });
        if (user.isVerified) {
            return res.status(200).json({ message: "Email already verified" });
          }
        user.isVerified = true;
        user.verificationToken = null;
        await user.save();
        res.status(200).json({ message: "Email verified successfully!" });
    } catch (error) {
        console.error("❌ Email Verification Error:", error);
        res.status(500).json({
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
// maid email verification
const verifyMaidEmail = async (req, res) => {
    try {
        const { token } = req.params;
        
        // 1. Find guide by verification token
        const guide = await User.findOne({ 
            verificationToken: token,
            role: 'maid' // Ensure we're verifying a guide account
        });
        
        if (!guide) {
            return res.status(400).json({ 
                message: "Invalid or expired token",
                code: "INVALID_TOKEN"
            });
        }

        // 2. Check if guide is already verified
        if (guide.isVerified) {
            return res.status(200).json({ 
                message: "maid email already verified",
                code: "ALREADY_VERIFIED",
                redirectUrl: guide.govIdVerified ? "instructor/dashboard" : "/instructor/upload-id"
            });
        }

        // 3. Update verification status
        guide.isVerified = true;
        guide.verificationToken = null;
        guide.verificationDate = new Date();
        
        await guide.save();

        // 4. Check if government ID needs to be uploaded
        const requiresIdUpload = !guide.govIdVerified && !guide.govIdPath;

        res.status(200).json({
            message: "Instructor email verified successfully!",
            code: "VERIFICATION_SUCCESS",
            requiresIdUpload,
            redirectUrl: requiresIdUpload ? "/Instructor/upload-id" : "Instructor/dashboard"
        });

    } catch (error) {
        console.error("❌ Instructor Email Verification Error:", error);
        res.status(500).json({ 
            message: "Server error during guide verification",
            code: "SERVER_ERROR",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
//chef email verification
const verifyChefEmail = async (req, res) => {
    try {
        const { token } = req.params;
        
        // 1. Find chef by verification token
        const chef = await User.findOne({ 
            verificationToken: token,
            role: 'chef' // Ensure we're verifying a chef account
        });
        
        if (!chef) {
            return res.status(400).json({ 
                message: "Invalid or expired token",
                code: "INVALID_TOKEN"
            });
        }

        // 2. Check if chef is already verified
        if (chef.isVerified) {
            return res.status(200).json({ 
                message: "Chef email already verified",
                code: "ALREADY_VERIFIED",
                redirectUrl: chef.govIdVerified ? "/chef/dashboard" : "/chef/upload-id"
            });
        }

        // 3. Update verification status
        chef.isVerified = true;
        chef.verificationToken = null;
        chef.verificationDate = new Date();
        
        await chef.save();

        // 4. Check if government ID needs to be uploaded
        const requiresIdUpload = !chef.govIdVerified && !chef.govIdPath;

        res.status(200).json({
            message: "Chef email verified successfully!",
            code: "VERIFICATION_SUCCESS",
            requiresIdUpload,
            redirectUrl: requiresIdUpload ? "/chef/upload-id" : "/chef/dashboard"
        });

    } catch (error) {
        console.error("❌ Chef Email Verification Error:", error);
        res.status(500).json({ 
            message: "Server error during chef verification",
            code: "SERVER_ERROR",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: "User not found" });

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryTime = Date.now() + 10 * 60 * 1000;

        await ResetPassword.create({ userId: user._id, email: user.email, resetPasswordCode: resetCode, resetPasswordExpires: expiryTime });
        await transporter.sendMail({ 
            from: `Smart Learning Hub <${process.env.EMAIL_USER}>`, 
            to: user.email, 
            subject: "Password Reset Code", 
            text: `Your reset code: ${resetCode}` 
        });
        res.status(200).json({ message: "Reset code sent to email" });
    } catch (error) {
        console.error("❌ Forgot Password Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const validUserId = [...verifiedResetSessions.keys()].find(userId => verifiedResetSessions.get(userId) > Date.now());
        if (!validUserId) return res.status(400).json({ message: "Reset session expired or invalid" });

        verifiedResetSessions.delete(validUserId);
        const user = await User.findById(validUserId);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("❌ Reset Password Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const verifyResetCode = async (req, res) => {
    try {
        const { otp } = req.body;
        if (!otp) {
            return res.status(400).json({ message: "Reset code is required" });
        }

        // Find the most recent valid reset code
        const resetRequest = await ResetPassword.findOne({ resetPasswordCode: otp })
            .sort({ resetPasswordExpires: -1 });

        if (!resetRequest || resetRequest.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired reset code" });
        }

        // Store userId in temporary storage
        verifiedResetSessions.set(resetRequest.userId.toString(), Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        res.status(200).json({ message: "Code verified successfully" });
    } catch (error) {
        console.error("❌ Verify Code Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getalluser = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        console.error("❌ Get All Users Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};  

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("❌ Delete User Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    uploadGovernmentIdAndBecomeInstructor,
    signup,
    signupMaid, // Updated from signupGuide
    resendVerificationEmail,
    login,
    maidLogin, // Updated from Guidelogin
    verifyEmail,
    verifyMaidEmail,
    forgotPassword,
    resetPassword,
    verifyResetCode,
    upload,// Exporting multer middleware if needed elsewhere
    signupChef,
    getalluser,
    deleteUser,
    chefLogin,
    verifyChefEmail,
};