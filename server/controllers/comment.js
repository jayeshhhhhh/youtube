import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import axios from "axios";

// Simple internal profanity filter to avoid "bad-words" import crashes
const BANNED_WORDS = [
  "badword1", "badword2", "spam",
  "abuse", "hate", "stupid", "idiot", "garbage", "trash",
  "offensive1", "offensive2", "offensive3", "offensive4"
]; // Expanded list of prohibited terms

const validateComment = (text) => {
  if (!text) return { isValid: false, message: "Comment body is required" };

  // Check for profanity using internal list
  const containsProfanity = BANNED_WORDS.some(word => text.toLowerCase().includes(word));
  if (containsProfanity) {
    return { isValid: false, message: "Your comment contains prohibited content" };
  }

  // Check for special character spam (e.g., "!!!!", "@@@@")
  const specialCharSpamRegex = /([!@#$%^&*(),.?":{}<>|\\/_])\1{3,}/;
  if (specialCharSpamRegex.test(text)) {
    return { isValid: false, message: "Your comment contains too many repeated special characters (spam)" };
  }

  // Check for general spam (any character repeated 5+ times)
  const generalSpamRegex = /(.)\1{4,}/;
  if (generalSpamRegex.test(text)) {
    return { isValid: false, message: "Your comment contains spam (repeated characters)" };
  }

  return { isValid: true };
};

export const postcomment = async (req, res) => {
  const commentdata = req.body;

  const validation = validateComment(commentdata.commentbody);
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.message });
  }

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
    const commentvideo = await comment.find({ videoid: videoid }).populate("userid");
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

  const validation = validateComment(commentbody);
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.message });
  }

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

export const likeComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment unavailable" });
  }

  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) return res.status(404).json({ message: "Comment not found" });

    const isLiked = existingComment.likes.includes(userid);
    const isDisliked = existingComment.dislikes.includes(userid);

    let update = {};
    if (isLiked) {
      update.$pull = { likes: userid };
    } else {
      update.$push = { likes: userid };
      update.$pull = { dislikes: userid };
    }

    const updatedComment = await comment.findByIdAndUpdate(_id, update, { new: true });
    return res.status(200).json(updatedComment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikeComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment unavailable" });
  }

  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) return res.status(404).json({ message: "Comment not found" });

    const isDisliked = existingComment.dislikes.includes(userid);
    const isLiked = existingComment.likes.includes(userid);

    let update = {};
    if (isDisliked) {
      update.$pull = { dislikes: userid };
    } else {
      update.$push = { dislikes: userid };
      update.$pull = { likes: userid };
    }

    const updatedComment = await comment.findByIdAndUpdate(_id, update, { new: true });
    return res.status(200).json(updatedComment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const reportComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment unavailable" });
  }

  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) return res.status(404).json({ message: "Comment not found" });

    await comment.findByIdAndUpdate(_id, {
      $push: { reportedBy: userid },
      $set: { isReported: true },
    });

    return res.status(200).json({ message: "Comment reported successfully" });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translateComment = async (req, res) => {
  const { id } = req.params;
  const { targetLanguage } = req.body;

  try {
    const existingComment = await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const response = await axios.get(
      "https://api.mymemory.translated.net/get",
      {
        params: {
          q: existingComment.commentbody,
          langpair: `en|${targetLanguage}`,
        },
      }
    );

    const translatedText = response.data.responseData.translatedText;
    existingComment.translatedText = translatedText;
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
