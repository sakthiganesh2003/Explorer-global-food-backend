const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "maid","chef","user"], default: "user" },
  profilePic: { type: String },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date }, 
  isVerified: { type: Boolean, default: false }, 
  credits: { 
    type: Number, 
    default: 10, // Give users some starting credits
    min: 0 
  },
  resetPasswordCode: String,
  resetPasswordExpires: Date,
});

UserSchema.methods.createJWT = function () {
  return jwt.sign(
    { userId: this._id, name: this.name },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", UserSchema);
module.exports = User;