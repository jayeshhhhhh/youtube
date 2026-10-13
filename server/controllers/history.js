
import video from "../Modals/video.js";
import history from "../Modals/history.js";
import mongoose from "mongoose";

export const handlehistory = async (req, res) => {
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

    await history.create({ viewer: userId, videoid: videoId });

    await video.findByIdAndUpdate(videoId, {
      $inc: { views: 1 },
    });

    return res.status(200).json({ history: true });
  } catch (error) {
    console.error("History error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const handleview = async (req, res) => {
  const { videoId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: "Invalid video ID." });
    }

    const updatedVideo = await video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!updatedVideo) {
      return res.status(404).json({ message: "Video not found." });
    }

    return res.status(200).json({ views: updatedVideo.views });
  } catch (error) {
    console.error("View error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const historyvideo = await history
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      historyvideo.filter((item) => item.videoid?._id)
    );
  } catch (error) {
    console.error("Get history error:", error);
    return res.status(500).json({ message: "Failed to fetch history." });
  }
};
