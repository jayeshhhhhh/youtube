import mongoose from "mongoose";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";

export const downloadVideo = async (req, res) => {
  const { userId, videoId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    return res.status(400).json({
      message: "Invalid user or video ID",
    });
  }

  try {
    const user = await users.findById(userId);
    const videoData = await video.findById(videoId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!videoData) {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    // Start of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // End of today
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Count today's downloads
    const todayDownloads = await download.countDocuments({
      userId: userId,
      downloadedAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    // Set daily limit
    const dailyLimit = user.plan === "premium"
      ? user.premiumDownloadLimit
      : 1;

    // Check limit
    if (todayDownloads >= dailyLimit) {
      return res.status(403).json({
        message:
          user.plan === "premium"
            ? `You have reached your daily limit of ${dailyLimit} downloads.`
            : "Free users can download only 1 video per day.",
        limitReached: true,
      });
    }

    // Save download record
    const newDownload = await download.create({
      userId: userId,
      videoId: videoId,
      userPlan: user.plan,
      videoTitle: videoData.videotitle,
      filename: videoData.filename,
      filepath: videoData.filepath,
      downloadedAt: new Date(),
    });

    return res.status(200).json({
      message: "Download started",
      download: newDownload,
      fileUrl: `${req.protocol}://${req.get("host")}/${videoData.filepath}`,
    });
  } catch (error) {
    console.error("Download error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};