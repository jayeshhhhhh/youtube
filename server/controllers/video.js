
import video from "../Modals/video.js";
import Download from "../Modals/download.js";
import User from "../Modals/Auth.js";

import cloudinary from "../config/cloudinary.js";
import { uploadVideoAndThumbnail } from "../utils/cloudinaryVideo.js";

import path from "path";
import mongoose from "mongoose";
import fs from "fs";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import { promisify } from "util";

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const execFileAsync = promisify(execFile);

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Find the actual video file on disk.
 */
function findVideoFile(v) {
  if (v.filepath && fs.existsSync(v.filepath)) {
    return v.filepath;
  }

  const filename = v.filepath || v.filename || "";
  const storedName = path.basename(filename);

  if (storedName) {
    const fallbackPath = path.join(UPLOAD_DIR, storedName);
    if (fs.existsSync(fallbackPath)) return fallbackPath;
  }

  return null;
}

/**
 * Generate a video thumbnail using FFmpeg.
 */


function userNames(user) {
  return [
    user.name,
    user.username,
    user.fullname,
    user.fullName,
    user.channelName,
    user.videochanel,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
}

// UPLOAD VIDEO

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please select a video file.",
    });
  }

  try {
    const { videotitle, videochanel, uploader, userId } = req.body;

    if (!videotitle?.trim() || !videochanel?.trim() || !uploader?.trim()) {
      return res.status(400).json({
        message: "Video title, channel name and uploader are required.",
      });
    }

    let uploaderId;

    if (userId) {
      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({
          message: "Invalid uploader account.",
        });
      }

      uploaderId = user._id;
    }

    const cloud = await uploadVideoAndThumbnail(
      req.file.path,
      req.file.originalname
    );

    const savedVideo = await video.create({
      videotitle: videotitle.trim(),
      filename: req.file.originalname,
      filepath: cloud.videoUrl,
      filetype: req.file.mimetype,
      filesize: String(cloud.filesize || req.file.size),
      thumbnail: cloud.thumbnailUrl,
      videoPublicId: cloud.videoPublicId,
      thumbnailPublicId: cloud.thumbnailPublicId,
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

    return res.status(500).json({
      message: "Video upload failed.",
      error: error.message,
    });
  } finally {
    await fs.promises.unlink(req.file.path).catch(() => {});
  }
};


// GET ALL VIDEOS
export const getallvideo = async (req, res) => {
  try {
    const videos = await video.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(videos);
  } catch (error) {
    console.error("Get videos error:", error);

    return res.status(500).json({
      message: "Failed to fetch videos",
    });
  }
};

// STREAM VIDEO

export const streamVideo = async (req, res) => {
  try {
    const v = await video.findById(req.params.id);

    if (!v) {
      return res.status(404).json({ message: "Video not found." });
    }

    await video.findByIdAndUpdate(v._id, {
      $inc: { views: 1 },
    });

    // New permanent Cloudinary video.
    if (v.filepath?.startsWith("https://res.cloudinary.com/")) {
      return res.redirect(302, v.filepath);
    }

    // Legacy local file fallback.
    const filePath = findVideoFile(v);

    if (!filePath) {
      return res.status(404).json({
        message: "Old video file is missing. Please upload it again.",
      });
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    res.setHeader("Content-Type", v.filetype || "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");

    if (range) {
      const parts = range.replace("bytes=", "").split("-");
      const start = Number(parts[0]);
      const end = parts[1]
        ? Math.min(Number(parts[1]), stat.size - 1)
        : stat.size - 1;

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        start >= stat.size ||
        start > end
      ) {
        return res.status(416).end();
      }

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": end - start + 1,
      });

      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }

    res.writeHead(200, { "Content-Length": stat.size });
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Stream error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Video streaming failed.",
      });
    }

    res.end();
  }
};


// DOWNLOAD VIDEO
export const downloadVideo = async (req, res) => {
  const { id: videoId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(401).json({
      message: "Please log in to download.",
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const v = await video.findById(videoId);

    if (!v) {
      return res.status(404).json({
        message: "Video not found.",
      });
    }

    const isCloudinaryVideo =
  v.filepath?.startsWith("https://res.cloudinary.com/");

const filePath = isCloudinaryVideo ? null : findVideoFile(v);

if (!isCloudinaryVideo && !filePath) {
  return res.status(410).json({
    message: "Video file is unavailable. Please upload it again.",
  });
}

    const plan = String(user.plan || "free").toLowerCase();

    const PLAN_LIMITS = {
      free: 1,
      bronze: 5,
      silver: 10,
      gold: 20,
    };

    const limit = PLAN_LIMITS[plan] || 1;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const downloadCount = await Download.countDocuments({
      userId: user._id,
      downloadDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
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

    if (isCloudinaryVideo) {
  return res.redirect(302, v.filepath);
}

return res.download(
  filePath,
  path.basename(v.filename || "video.mp4")
);
  } catch (error) {
    console.error("Download error:", error);

    return res.status(500).json({
      message: "Video download failed.",
    });
  }
};

// DELETE VIDEO
export const deleteVideo = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        message: "Invalid user.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        message: "Invalid user.",
      });
    }

    const v = await video.findById(req.params.id);

    if (!v) {
      return res.status(404).json({
        message: "Video not found.",
      });
    }

    // Only the original uploader can delete
    if (
      !v.uploaderId ||
      String(v.uploaderId) !== String(user._id)
    ) {
      return res.status(403).json({
        message: "Only the uploader can delete this video.",
      });
    }

    const filePath = findVideoFile(v);
    const thumbnailPath = v.thumbnail
      ? path.join(UPLOAD_DIR, path.basename(v.thumbnail))
      : null;

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

    if (thumbnailPath && thumbnailPath !== filePath) {
      try {
        await fs.promises.unlink(thumbnailPath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Thumbnail cleanup error:", error);
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
