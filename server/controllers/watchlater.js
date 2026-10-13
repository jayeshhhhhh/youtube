
import watchlater from "../Modals/watchlater.js";
import video from "../Modals/video.js";
import mongoose from "mongoose";

export const handlewatchlater = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  try {
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(videoId)
    ) {
      return res.status(400).json({ message: "Invalid user or video ID." });
    }

    const existingVideo = await video.findById(videoId);
    if (!existingVideo) {
      return res.status(404).json({ message: "Video not found." });
    }

    const existingWatchLater = await watchlater.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingWatchLater) {
      await watchlater.findByIdAndDelete(existingWatchLater._id);
      return res.status(200).json({ watchlater: false });
    }

    await watchlater.create({ viewer: userId, videoid: videoId });
    return res.status(200).json({ watchlater: true });
  } catch (error) {
    console.error("Watch later error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const getallwatchlater = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const watchlatervideo = await watchlater
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      watchlatervideo.filter((item) => item.videoid?._id)
    );
  } catch (error) {
    console.error("Get watch later error:", error);
    return res.status(500).json({ message: "Failed to fetch watch later." });
  }
};
