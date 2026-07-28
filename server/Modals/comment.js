import mongoose from "mongoose";

const commentschema = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },

  videoid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "videofiles",
  },

  commentbody: {
    type: String,
  },

  usercommented: {
    type: String,
  },

  language: {
    type: String,
    default: "en",
  },

  translatedText: {
    type: String,
    default: "",
  },

  likes: {
    type: Number,
    default: 0,
  },

  dislikes: {
    type: Number,
    default: 0,
  },

  reports: {
    type: Number,
    default: 0,
  },

  status: {
    type: String,
    enum: ["active", "reported", "removed"],
    default: "active",
  },

  showLocation: {
    type: Boolean,
    default: false,
  },

  location: {
    type: String,
    default: "",
  },

  commentedon: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("comment", commentschema);