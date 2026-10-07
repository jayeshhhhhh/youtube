import mongoose from "mongoose";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";

const PLAN_LIMITS = {
  free: 1,
  bronze: 5,
  silver: 10,
  gold: 20,
};

export const downloadVideo = async (req, res) => {
  try {
    const { userId, videoId } = req.body;

    if (!userId || !videoId) {
      return res.status(400).json({
        message: "User ID and Video ID are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(videoId)
    ) {
      return res.status(400).json({
        message: "Invalid user or video ID.",
      });
    }

    const user = await users.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const videoData = await video.findById(videoId);

    if (!videoData) {
      return res.status(404).json({
        message: "Video not found.",
      });
    }

    const plan = String(user.plan || "free").toLowerCase();
    const dailyLimit = PLAN_LIMITS[plan] || 1;

    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayDownloads = await download.countDocuments({
      userId: user._id,
      downloadDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (todayDownloads >= dailyLimit) {
      return res.status(403).json({
        message:
          plan === "free"
            ? "Free users can download only 1 video per day."
            : `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan allows ${dailyLimit} downloads per day. You have reached today's limit.`,
        limitReached: true,
        plan,
        dailyLimit,
        todayDownloads,
        remainingDownloads: 0,
      });
    }

    const newDownload = await download.create({
      userId: user._id,
      videoId: videoData._id,
      videoTitle: videoData.videotitle,
      thumbnail: videoData.thumbnail || "",
      filename: videoData.filename,
      filepath: videoData.filepath,
      fileSize: videoData.filesize || "",
      planAtDownload: plan,
      downloadDate: now,
      downloadCount: 1,
    });

    const newCount = todayDownloads + 1;

    return res.status(200).json({
      message: "Download started successfully.",
      download: newDownload,
      plan,
      dailyLimit,
      todayDownloads: newCount,
      remainingDownloads: Math.max(dailyLimit - newCount, 0),
      fileUrl: `${req.protocol}://${req.get("host")}/${videoData.filepath}`,
    });
  } catch (error) {
    console.error("Download error:", error);

    return res.status(500).json({
      message: "Something went wrong during download.",
      error: error.message,
    });
  }
};

export const getUserDownloads = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const user = await users.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const plan = String(user.plan || "free").toLowerCase();
    const dailyLimit = PLAN_LIMITS[plan] || 1;

    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayDownloads = await download.countDocuments({
      userId: user._id,
      downloadDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    const downloads = await download
      .find({ userId: user._id })
      .sort({ downloadDate: -1 })
      .lean();

    return res.status(200).json({
      downloads,
      plan,
      dailyLimit,
      todayDownloads,
      remainingDownloads: Math.max(
        dailyLimit - todayDownloads,
        0
      ),
    });
  } catch (error) {
    console.error("Get downloads error:", error);

    return res.status(500).json({
      message: "Something went wrong.",
      error: error.message,
    });
  }
};