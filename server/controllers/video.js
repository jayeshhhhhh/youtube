
import video from "../Modals/video.js";
import Download from "../Modals/download.js";
import User from "../Modals/Auth.js";
import path from "path";
import mongoose from "mongoose";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, "../uploads");

function findVideoFile(v) {
  if (v.filepath && fs.existsSync(v.filepath)) {
    return v.filepath;
  }

  const storedName = path.basename(v.filepath || "");
  if (storedName) {
    const fallbackPath = path.join(UPLOAD_DIR, storedName);
    if (fs.existsSync(fallbackPath)) return fallbackPath;
  }

  return null;
}

function userNames(user) {
  return [
    user.name,
    user.username,
    user.fullname,
    user.fullName,
    user.channelName,
    user.videochanel,
  ].filter(Boolean).map((value) => String(value).trim().toLowerCase());
}

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please select a video file." });
  }

  try {
    const { videotitle, videochanel, uploader, userId } = req.body;

    if (!videotitle?.trim() || !videochanel?.trim() || !uploader?.trim()) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message: "Video title, channel name and uploader are required.",
      });
    }

    let uploaderId;
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        fs.unlink(req.file.path, () => {});
        return res.status(401).json({ message: "Invalid uploader account." });
      }
      uploaderId = user._id;
    }

    const savedVideo = await video.create({
      videotitle: videotitle.trim(),
      filename: req.file.originalname,
     filepath: req.file.filename,
      filetype: req.file.mimetype,
      filesize: String(req.file.size),
      videochanel: videochanel.trim(),
      uploader: uploader.trim(),
      ...(uploaderId ? { uploaderId } : {}),
    });

    return res.status(201).json({
      success: true,
      message: "Video uploaded successfully.",
      video: savedVideo,
    });
  } catch (error) {
    console.error("Upload error:", error);
    fs.unlink(req.file.path, () => {});
    return res.status(500).json({ message: "Video upload failed." });
  }
};

export const getallvideo = async (req, res) => {
  try {
    const videos = await video.find()
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(videos);
  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
};


export const streamVideo = async (req, res) => {
  try {
    const v = await video.findById(req.params.id);
    if (!v) return res.status(404).json({ message: "Video not found." });

    const filePath = findVideoFile(v);
    if (!filePath) {
      return res.status(410).json({
        message: "Video file is unavailable on the server. Please upload it again.",
      });
    }

    res.type(v.filetype || path.extname(filePath));
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error("Video streaming error:", error);
    return res.status(500).json({ message: "Unable to play this video." });
  }
};

export const downloadVideo = async (req, res) => {
  const { id: videoId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(401).json({ message: "Please log in to download." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const v = await video.findById(videoId);
    if (!v) return res.status(404).json({ message: "Video not found." });

    const filePath = findVideoFile(v);
    if (!filePath) {
      return res.status(410).json({
        message: "Video file is unavailable on the server. Please upload it again.",
      });
    }

    const plan = String(user.plan || "free").toLowerCase();
    const PLAN_LIMITS = { free: 1, bronze: 5, silver: 10, gold: 20 };
    const limit = PLAN_LIMITS[plan] || 1;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const downloadCount = await Download.countDocuments({
      userId: user._id,
      downloadDate: { $gte: startOfDay, $lte: endOfDay },
    });

    if (downloadCount >= limit) {
      return res.status(403).json({
        message: `Daily download limit reached. Your ${plan} plan allows ${limit} downloads per day.`,
        plan,
        dailyLimit: limit,
        todayDownloads: downloadCount,
        remainingDownloads: 0,
      });
    }

    await Download.create({
      userId: user._id,
      videoId: v._id,
      filename: v.filename,
      videoTitle: v.videotitle,
      filepath: v.filepath,
      planAtDownload: plan,
      downloadDate: new Date(),
      downloadCount: 1,
    });

    return res.download(filePath, path.basename(v.filename || "video.mp4"));
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Video download failed." });
  }
};

export const deleteVideo = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(401).json({ message: "Please log in first." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "Invalid user." });

    const v = await video.findById(req.params.id);
    if (!v) return res.status(404).json({ message: "Video not found." });

    const ownsById =
      v.uploaderId && String(v.uploaderId) === String(user._id);

    const names = userNames(user);
    const ownsByName =
      v.uploader && names.includes(String(v.uploader).trim().toLowerCase());

    if (!ownsById && !ownsByName) {
      return res.status(403).json({
        message: "Only the uploader can delete this video.",
      });
    }

    const filePath = findVideoFile(v);
    await video.findByIdAndDelete(v._id);

    if (filePath) {
      fs.unlink(filePath, (error) => {
        if (error) console.error("Video file cleanup error:", error);
      });
    }

    return res.json({ success: true, message: "Video deleted successfully." });
  } catch (error) {
    console.error("Delete video error:", error);
    return res.status(500).json({ message: "Video deletion failed." });
  }
};
