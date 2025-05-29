const mongoose = require('mongoose');
const maidSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  experience: { type: String, required: true },
  image: { type: String, required: true, default: 'default.jpg' }, // Default if separate from aadhaarPhoto
  rating: { type: Number, required: true, default: 0 }, // Default rating
  specialties: [{ type: String }],
  bio: { type: String, required: true },
  aadhaarNumber: { type: String, required: true },
  aadhaarPhoto: { type: String, required: true },
   location:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Location",
      required:true,
    },
    pincode : {type:Number,required:true},
  bankDetails: {
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    ifscCode: { type: String, required: true },
    accountHolderName: { type: String, required: true }
  },
  status: { type: String, default: 'pending' }


});
module.exports = mongoose.model('FormMaid', maidSchema);