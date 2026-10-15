import video from "../Modals/video.js";
import Download from "../Modals/download.js";
import User from "../Modals/Auth.js";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import fs from "fs";
import { fileURLToPath } from "url";

// Setup absolute paths correctly for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// This ensures UPLOAD_DIR is always the /uploads folder at the project root
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

/**
 * Helper to find where the video file actually exists on disk
 */
function findVideoFile(v) {
  // 1. Try the filepath if it's already an absolute path or valid relative path
  if (v.filepath && fs.existsSync(v.filepath)) {
    return v.filepath;
  }

  // 2. Try to find it in the root uploads folder using the filename
  const filename = v.filepath || v.filename || "";
  const storedName = path.basename(filename);
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
    return res.status(400).json({ message: "Please select a video." });
  }

  try {
    const { videotitle, videochanel, uploader, userId } = req.body;

    if (!videotitle?.trim() || !videochanel?.trim() || !uploader?.trim()) {
      return res.status(400).json({
        message: "Title, channel and uploader are required.",
      });
    }

    let uploaderId;

    if (userId) {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({ message: "Invalid uploader account." });
      }

      uploaderId = user._id;
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "yourtube/videos",
      eager: [
        {
          format: "jpg",
          transformation: [
            { width: 640, height: 360, crop: "fill" },
          ],
        },
      ],
      eager_async: false,
    });

    const thumbnail = result.eager?.[0]?.secure_url || "";

    const savedVideo = await video.create({
      videotitle: videotitle.trim(),
      filename: req.file.originalname,
      filepath: result.secure_url,
      filetype: req.file.mimetype,
      filesize: String(req.file.size),
      thumbnail,
      videochanel: videochanel.trim(),
      uploader: uploader.trim(),
      ...(uploaderId ? { uploaderId } : {}),
    });

    fs.unlink(req.file.path, () => {});

    return res.status(201).json({
      success: true,
      message: "Video uploaded successfully.",
      video: savedVideo,
    });
  } catch (error) {
    console.error("Cloudinary video upload error:", error);
    return res.status(500).json({
      message: "Video upload failed.",
      error: error.message,
    });
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
    const v = await video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!v) {
      return res.status(404).json({ message: "Video not found." });
    }

    // Cloudinary video
    if (v.filepath?.startsWith("https://res.cloudinary.com/")) {
      return res.redirect(v.filepath);
      if (v.filepath?.startsWith("https://res.cloudinary.com/")) {
  return res.redirect(v.filepath);
}
    }

    // Legacy local video
    const filePath = findVideoFile(v);

    if (!filePath) {
      return res.status(404).json({
        message: "Video file unavailable. Please upload again.",
      });
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    res.setHeader("Content-Type", v.filetype || "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Number(parts[0]);
      const end = parts[1] ? Number(parts[1]) : stat.size - 1;

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end < start ||
        start >= stat.size
      ) {
        return res.status(416).end();
      }

      const safeEnd = Math.min(end, stat.size - 1);

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${safeEnd}/${stat.size}`,
        "Content-Length": safeEnd - start + 1,
      });

      return fs.createReadStream(filePath, {
        start,
        end: safeEnd,
      }).pipe(res);
    }

    res.writeHead(200, { "Content-Length": stat.size });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).json({ message: "Video streaming failed." });
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
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Invalid user." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid user." });
    }

    const v = await video.findById(req.params.id);
    if (!v) {
      return res.status(404).json({ message: "Video not found." });
    }

    // Only the original uploader ID can delete
    if (
      !v.uploaderId ||
      String(v.uploaderId) !== String(user._id)
    ) {
      return res.status(403).json({
        message: "Only the uploader can delete this video.",
      });
    }

    const filePath = findVideoFile(v);

    await video.findByIdAndDelete(v._id);

    if (filePath) {
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Video file cleanup error:", error);
        }
      }
    }

    return res.json({
      success: true,
      message: "Video deleted successfully.",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    return res.status(500).json({
      message: "Video deletion failed.",
    });
  }
};
