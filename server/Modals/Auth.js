import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  location: { type: String },
  showLocation: { type: Boolean, default: false },

  // Plan and Theme
  plan: { type: String, enum: ['free', 'bronze', 'silver', 'gold'], default: 'free' },
  preferredTheme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },

  // Security Tracking
  lastLoginIp: { type: String },
  lastLoginDevice: { type: String },
  lastLoginLocation: { type: String },
  otpCode: { type: String },
  otpExpiresAt: { type: Date },

  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
