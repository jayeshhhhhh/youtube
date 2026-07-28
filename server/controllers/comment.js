import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import axios from "axios";
export const postcomment = async (req, res) => {
  const commentdata = req.body;
  const postcomment = new comment(commentdata);

  try {
    await postcomment.save();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;

  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("Comment unavailable");
  }

  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("Comment unavailable");
  }

  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      {
        $set: {
          commentbody: commentbody,
        },
      },
      { new: true }
    );

    return res.status(200).json(updatecomment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ================= LIKE =================

export const likeComment = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedComment = await comment.findByIdAndUpdate(
      id,
      {
        $inc: { likes: 1 },
      },
      { new: true }
    );

    return res.status(200).json(updatedComment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ================= DISLIKE =================

export const dislikeComment = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedComment = await comment.findByIdAndUpdate(
      id,
      {
        $inc: { dislikes: 1 },
      },
      { new: true }
    );

    return res.status(200).json(updatedComment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
//translate comment
export const translateComment = async (req, res) => {
  const { id } = req.params;
  const { targetLanguage } = req.body;

  try {
    const existingComment = await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

   const response = await axios.post(
  "https://translate.argosopentech.com/translate",
  {
    q: existingComment.commentbody,
    source: "auto",
    target: targetLanguage,
    format: "text",
  },
  {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 10000,
  }
);

    existingComment.translatedText = response.data.translatedText;
    existingComment.language = targetLanguage;

    await existingComment.save();

    res.status(200).json(existingComment);
  } catch (error) {
  console.error(error.response?.data || error.message || error);
  return res.status(500).json({
    message: error.response?.data || error.message,
  });
}
};