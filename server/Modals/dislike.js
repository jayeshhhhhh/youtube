import mongoose from "mongoose";

const dislikeschema = mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("dislike", dislikeschema);