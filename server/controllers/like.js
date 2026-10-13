
import video from "../Modals/video.js";
import like from "../Modals/like.js";
import mongoose from "mongoose";

export const handlelike = async (req, res) => {
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

    const existingLike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingLike) {
      await like.findByIdAndDelete(existingLike._id);

      await video.findByIdAndUpdate(videoId, {
        $inc: { Like: -1 },
      });

      return res.status(200).json({ liked: false });
    }

    await like.create({ viewer: userId, videoid: videoId });

    await video.findByIdAndUpdate(videoId, {
      $inc: { Like: 1 },
    });

    return res.status(200).json({ liked: true });
  } catch (error) {
    console.error("Like error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      likevideo.filter((item) => item.videoid?._id)
    );
  } catch (error) {
    console.error("Get liked videos error:", error);
    return res.status(500).json({ message: "Failed to fetch liked videos." });
  }
};
