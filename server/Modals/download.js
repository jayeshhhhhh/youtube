import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    videoTitle: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    filename: {
      type: String,
      required: true,
    },
    filepath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: String,
      default: "",
    },
    planAtDownload: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
      required: true,
    },
    downloadDate: {
      type: Date,
      default: Date.now,
    },
    downloadCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

downloadSchema.index({ userId: 1, downloadDate: -1 });

export default mongoose.model("download", downloadSchema);