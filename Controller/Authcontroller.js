const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../Models/Users");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const ResetPassword = require("../Models/ResetPassword");


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

// User Signup
const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            isVerified: false,
            verificationToken,
        });

        await newUser.save();

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

        await transporter.sendMail({
            from: `"Global_food_explore" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email",
            html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
        });

        res.status(201).json({ message: "User registered successfully. Please verify your email." });
    } catch (error) {
        console.error("❌ Signup Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// User Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Please enter a valid email and password" });
        }

        const user = await User.findOne({ email });
        // if (!user || !user.isVerified) {
        //     return res.status(403).json({ error: "Please verify your email before logging in" });
        // }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful",
            user: { _id: user._id.toString(), name: user.name, role: user.role },
            token,
        });
    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Forgot Password
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
            from: `Global_food_explore <${process.env.EMAIL_USER}>`, 
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


// Verify Reset Code
// Define the Map for storing sessions
const verifyResetCode = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ message: "Reset code is required" });
        }

        // Find the most recent valid reset code
        const resetRequest = await ResetPassword.findOne({ resetPasswordCode: otp })
            .sort({ resetPasswordExpires: -1});

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





// Reset Password
// Define the verifyOtpForUser function
const verifiedResetSessions = new Map(); // Define an in-memory session store

const resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        // Look for the first valid session with an OTP that hasn't expired
        const validUserId = [...verifiedResetSessions.keys()].find(
            userId => verifiedResetSessions.get(userId) > Date.now()
        );

        if (!validUserId) {
            return res.status(400).json({ message: "Reset session expired or invalid" });
        }

        // Remove the session as the OTP is verified
        verifiedResetSessions.delete(validUserId);

        // Find the user by ID
        const user = await User.findById(validUserId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Hash and update the user's password
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("❌ Reset Password Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};




// Verify Email
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        res.status(200).json({ message: "Email verified successfully!" });
    } catch (error) {
        console.error("❌ Email Verification Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { signup, login, verifyEmail, forgotPassword, verifyResetCode, resetPassword };
