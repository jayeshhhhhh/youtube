import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  location: { type: String },
  showLocation: { type: Boolean, default: false },
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  joinedon: { type: Date, default: Date.now },

  // Download plan
  plan: {
    type: String,
    enum: ["free", "premium"],
    default: "free",
  },

  // Premium download limit per day
  premiumDownloadLimit: {
    type: Number,
    default: 5,
  },
});

export default mongoose.model("user", userschema);