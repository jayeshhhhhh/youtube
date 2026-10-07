import video from "../Modals/video.js";
import dislike from "../Modals/dislike.js";
import like from "../Modals/like.js";

export const handledislike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  try {
    const existingDislike = await dislike.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingDislike) {
      await dislike.findByIdAndDelete(existingDislike._id);

      await video.findByIdAndUpdate(videoId, {
        $inc: { Dislike: -1 },
      });

      return res.status(200).json({ disliked: false });
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
    }

    await dislike.create({
      viewer: userId,
      videoid: videoId,
    });

    await video.findByIdAndUpdate(videoId, {
      $inc: { Dislike: 1 },
    });

    return res.status(200).json({ disliked: true });
  } catch (error) {
    console.error("Dislike error:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getallDislikedVideo = async (req, res) => {
  const { userId } = req.params;

  try {
    const dislikevideo = await dislike
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();

    return res.status(200).json(dislikevideo);
  } catch (error) {
    console.error("Dislike error:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};