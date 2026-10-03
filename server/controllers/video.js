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
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // 1. Fetch User Plan
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = user.plan || "free";
    const limit = plan === "premium" ? 10 : 1;

    // 2. Check Daily Download Count
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const downloadCount = await Download.countDocuments({
      userId: userId,
      downloadDate: { $gte: startOfDay },
    });

    if (downloadCount >= limit) {
      return res.status(403).json({
        message: `Plan limit reached. ${plan === "premium" ? "Premium" : "Free"} users can download up to ${limit} videos per day.`
      });
    }

    // 3. Fetch Video Details
    const v = await video.findById(videoId);
    if (!v) return res.status(404).json({ message: "Video not found" });

    // 4. Log Download
    await Download.create({
      userId: userId,
      videoId: videoId,
      planAtDownload: plan,
    });

    // 5. Trigger Download
    // Use the filepath stored in DB (which is relative to the server root)
    const absolutePath = path.resolve(v.filepath);
    res.download(absolutePath, v.filename);
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Something went wrong during download" });
  }
};
