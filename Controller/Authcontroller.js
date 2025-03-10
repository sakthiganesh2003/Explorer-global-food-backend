// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const dotenv = require("dotenv");
// const User = require("../models/User");
// const nodemailer = require("nodemailer");
// const crypto = require("crypto");
// dotenv.config();

// const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//     },
//     tls: {
//         rejectUnauthorized: false,
//     },
// });


const signup = async (req, res) => {
    res.signup("signup");
}
const login = async (req, res) => {
    res.signup("login");
};

// Reset Password Controller
const resetPassword = async (req, res) => {
    res.resetPassword("resetpassword");
};
const verifyEmail = async (req, res) => {
   res.verifyEmail("verifyemail");
};
const forgotPassword = async (req, res) => {
    res.forgotPassword("forgetpassword");
};

const verifyResetCode  = async (req, res) => {
    res.verifyResetCode("verifyResetCode");
};




module.exports = { signup, login, verifyEmail, forgotPassword, verifyResetCode, resetPassword };