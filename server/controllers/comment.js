
import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import axios from "axios";

const BANNED_WORDS = [
  "badword1",
  "badword2",
  "spam",
  "abuse",
  "abusive",
  "hate",
  "stupid",
  "idiot",
  "idiotic",
  "dumb",
  "fool",
  "foolish",
  "jerk",
  "moron",
  "loser",
  "garbage",
  "trash",
  "crap",
  "damn",
  "hell",
  "piss",
  "shit",
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "bitch",
  "bitches",
  "ass",
  "asshole",
  "bastard",
  "dick",
  "dickhead",
  "pussy",
  "slut",
  "whore",
  "creep",
  "chutiya",
  "chutiye",
  "madarchod",
  "behenchod",
  "bhenchod",
  "bc",
  "mc",
  "gand",
  "gaand",
  "gandu",
  "harami",
  "haraami",
  "kamina",
  "kamine",
  "kutte",
  "kutti",
  "randi",
  "bakchod",
  "bakchodi",
  "lavda",
  "lauda",
  "lund",
  "chut",
  "chudai",
  "chod",
  "chodna",
  "chodu",
  "aai zavali",
  "aai zavli",
  "zavli",
  "zavali",
  "offensive1",
  "offensive2",
  "offensive3",
  "offensive"
];

const validateComment = (text) => {
  if (!text || !text.trim()) {
    return {
      isValid: false,
      message: "Comment body is required"
    };
  }

  const normalizedText = text.toLowerCase().trim();

  const containsProfanity = BANNED_WORDS.some(
    (word) =>
      normalizedText.includes(word.toLowerCase())
  );

  if (containsProfanity) {
    return {
      isValid: false,
      message:
        "Your comment contains prohibited content"
    };
  }

  const specialCharSpamRegex =
    /([!@#$%^&*(),.?":{}<>|\\/_+=~`[\]-])\1{3,}/;

  if (specialCharSpamRegex.test(text)) {
    return {
      isValid: false,
      message:
        "Your comment contains too many repeated special characters (spam)"
    };
  }

  const repeatedCharacterRegex = /(.)\1{4,}/;

  if (repeatedCharacterRegex.test(text)) {
    return {
      isValid: false,
      message:
        "Your comment contains spam (repeated characters)"
    };
  }

  return {
    isValid: true
  };
};

export const postcomment = async (req, res) => {
  const commentdata = req.body;

  const validation = validateComment(
    commentdata.commentbody
  );

  if (!validation.isValid) {
    return res.status(400).json({
      message: validation.message
    });
  }

  const postcomment = new comment(commentdata);

  try {
    await postcomment.save();

    return res.status(200).json({
      comment: true
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;

  try {
    const commentvideo = await comment
      .find({ videoid: videoid })
      .populate("userid");

    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send(
      "Comment unavailable"
    );
  }

  try {
    await comment.findByIdAndDelete(_id);

    return res.status(200).json({
      comment: true
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  const validation = validateComment(commentbody);

  if (!validation.isValid) {
    return res.status(400).json({
      message: validation.message
    });
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send(
      "Comment unavailable"
    );
  }

  try {
    const updatecomment =
      await comment.findByIdAndUpdate(
        _id,
        {
          $set: {
            commentbody: commentbody,
            translatedText: undefined,
            language: undefined
          }
        },
        {
          new: true
        }
      );

    if (!updatecomment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    return res.status(200).json(updatecomment);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};

export const likeComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!userid) {
    return res.status(400).json({
      message: "User ID is required"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({
      message: "Comment unavailable"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(userid)) {
    return res.status(400).json({
      message: "Invalid user ID"
    });
  }

  try {
    const existingComment =
      await comment.findById(_id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    const userIdString = String(userid);

    const alreadyLiked =
      existingComment.likes.some(
        (id) =>
          String(id) === userIdString
      );

    if (alreadyLiked) {
      existingComment.likes =
        existingComment.likes.filter(
          (id) =>
            String(id) !== userIdString
        );
    } else {
      existingComment.likes =
        existingComment.likes.filter(
          (id) =>
            String(id) !== userIdString
        );

      existingComment.dislikes =
        existingComment.dislikes.filter(
          (id) =>
            String(id) !== userIdString
        );

      existingComment.likes.push(userid);
    }

    await existingComment.save();

    return res.status(200).json(
      existingComment
    );
  } catch (error) {
    console.error(
      "Like error:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};

export const dislikeComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!userid) {
    return res.status(400).json({
      message: "User ID is required"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({
      message: "Comment unavailable"
    });
  }

  if (!mongoose.Types.ObjectId.isValid(userid)) {
    return res.status(400).json({
      message: "Invalid user ID"
    });
  }

  try {
    const existingComment =
      await comment.findById(_id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    const userIdString = String(userid);

    const alreadyDisliked =
      existingComment.dislikes.some(
        (id) =>
          String(id) === userIdString
      );

    if (alreadyDisliked) {
      existingComment.dislikes =
        existingComment.dislikes.filter(
          (id) =>
            String(id) !== userIdString
        );
    } else {
      existingComment.dislikes =
        existingComment.dislikes.filter(
          (id) =>
            String(id) !== userIdString
        );

      existingComment.likes =
        existingComment.likes.filter(
          (id) =>
            String(id) !== userIdString
        );

      existingComment.dislikes.push(userid);
    }

    await existingComment.save();

    return res.status(200).json(
      existingComment
    );
  } catch (error) {
    console.error(
      "Dislike error:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};

export const reportComment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({
      message: "Comment unavailable"
    });
  }

  if (!userid) {
    return res.status(400).json({
      message: "User ID is required"
    });
  }

  try {
    const existingComment =
      await comment.findById(_id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    await comment.findByIdAndUpdate(
      _id,
      {
        $addToSet: {
          reportedBy: userid
        },
        $set: {
          isReported: true
        }
      }
    );

    return res.status(200).json({
      message: "Comment reported successfully"
    });
  } catch (error) {
    console.error(
      "Report error:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};

export const translateComment = async (
  req,
  res
) => {
  const { id } = req.params;
  const { targetLanguage } = req.body;

  const supportedLanguages = [
    "en",
    "hi",
    "mr",
    "ta",
    "bn"
  ];

  if (
    !supportedLanguages.includes(
      targetLanguage
    )
  ) {
    return res.status(400).json({
      message: "Unsupported target language"
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return res.status(404).json({
      message: "Comment unavailable"
    });
  }

  try {
    const existingComment =
      await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found"
      });
    }

    const response = await axios.get(
      "https://api.mymemory.translated.net/get",
      {
        params: {
          q: existingComment.commentbody,
          langpair: `autodetect|${targetLanguage}`
        }
      }
    );

    const translatedText =
      response.data?.responseData
        ?.translatedText;

    if (!translatedText) {
      return res.status(500).json({
        message: "Translation failed"
      });
    }

    existingComment.translatedText =
      translatedText;

    existingComment.language =
      targetLanguage;

    await existingComment.save();

    return res.status(200).json(
      existingComment
    );
  } catch (error) {
    console.error(
      error.response?.data ||
        error.message ||
        error
    );

    return res.status(500).json({
      message:
        error.response?.data?.message ||
        error.message ||
        "Translation failed"
    });
  }
};

