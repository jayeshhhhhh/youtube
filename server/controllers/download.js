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
  const { id: videoId } = req.params;
  const { userId } = req.query;

  try {
    if (!userId || !videoId) {
      return res.status(400).json({ message: "User ID and Video ID required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const v = await video.findById(videoId);
    if (!v) {
      return res.status(404).json({ message: "Video not found." });
    }

    const plan = String(user.plan || "free").toLowerCase();
    const limits = { free: 1, bronze: 5, silver: 10, gold: 20 };
    const limit = limits[plan] || 1;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const count = await Download.countDocuments({
      userId: user._id,
      downloadDate: { $gte: start },
    });

    if (count >= limit) {
      return res.status(403).json({
        message: `Daily download limit reached. Your ${plan} plan allows ${limit} downloads per day.`,
      });
    }

    // Find the file in the backend uploads directory.
    const filename = path.basename(v.filepath || v.filename);
    const absolutePath = path.join(process.cwd(), "uploads", filename);

    if (!fs.existsSync(absolutePath)) {
      console.error("Download file missing:", absolutePath);
      return res.status(410).json({
        message: "Video file missing on server. Please upload it again.",
      });
    }

    await Download.create({
      userId: user._id,
      videoId: v._id,
      filename: v.filename,
      videoTitle: v.videotitle,
      filepath: absolutePath,
      planAtDownload: plan,
      downloadDate: new Date(),
      downloadCount: 1,
    });

    return res.download(absolutePath, v.filename);
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Video download failed." });
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