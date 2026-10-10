
import video from "../Modals/video.js";
import Download from "../Modals/download.js";
import User from "../Modals/Auth.js";
import path from "path";
import fs from "fs";

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please select a supported video file.",
    });
  }

  try {
    const {
      videotitle,
      videochanel,
      uploader,
    } = req.body;

    if (!videotitle?.trim() || !videochanel?.trim() || !uploader?.trim()) {
      fs.unlink(req.file.path, () => {});

      return res.status(400).json({
        message: "Video title, channel name and uploader are required.",
      });
    }

    const savedVideo = await video.create({
      videotitle: videotitle.trim(),
      filename: req.file.originalname,
      filepath: req.file.path,
      filetype: req.file.mimetype,
      filesize: String(req.file.size),
      videochanel: videochanel.trim(),
      uploader: uploader.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Video uploaded successfully.",
      video: savedVideo,
    });
  } catch (error) {
    console.error("Video upload error:", error);

    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }

    return res.status(500).json({
      message: "Video upload failed.",
    });
  }
};

export const getallvideo = async (_req, res) => {
  try {
    const files = await video.find().sort({ createdAt: -1 });

    return res.status(200).json(files);
  } catch (error) {
    console.error("Get videos error:", error);

    return res.status(500).json({
      message: "Unable to fetch videos.",
    });
  }
};

export const downloadVideo = async (req, res) => {
  const { id: videoId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
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

    const v = await video.findById(videoId);

    if (!v) {
      return res.status(404).json({
        message: "Video not found.",
      });
    }

    const absolutePath = path.resolve(v.filepath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(410).json({
        message: "Video file is no longer available. Please upload it again.",
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

    return res.download(absolutePath, v.filename);
  } catch (error) {
    console.error("Download error:", error);

    return res.status(500).json({
      message: "Video download failed.",
    });
  }
};
