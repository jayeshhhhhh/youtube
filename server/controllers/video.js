import video from "../Modals/video.js";
import Download from "../Modals/download.js";
import User from "../Modals/Auth.js";
import mongoose from "mongoose";
import path from "path";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: req.file.path,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const downloadVideo = async (req, res) => {
  const { id: videoId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
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

    console.log(
      "DOWNLOAD CHECK:",
      "Plan:",
      plan,
      "Count:",
      downloadCount,
      "Limit:",
      limit
    );

    if (downloadCount >= limit) {
      return res.status(403).json({
        message: `Daily download limit reached. Your ${plan} plan allows ${limit} download${limit === 1 ? "" : "s"} per day.`,
        plan,
        dailyLimit: limit,
        todayDownloads: downloadCount,
        remainingDownloads: 0,
      });
    }

    const v = await video.findById(videoId);

    if (!v) {
      return res.status(404).json({
        message: "Video not found",
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

    const absolutePath = path.resolve(v.filepath);

    return res.download(absolutePath, v.filename);
  } catch (error) {
    console.error("Download error:", error);

    return res.status(500).json({
      message: "Something went wrong during download",
    });
  }
};