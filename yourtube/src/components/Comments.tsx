
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

import {
  ThumbsUp,
  ThumbsDown,
  Flag,
  Languages
} from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string | { _id: string };
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes: string[];
  dislikes: string[];
  location?: string;
  showLocation?: boolean;
  language?: string;
  translatedText?: string;
  userid_details?: {
    location?: string;
    showLocation?: boolean;
  };
}

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [language, setLanguage] = useState("en");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [translationMenuId, setTranslationMenuId] =
    useState<string | null>(null);

  const [editingCommentId, setEditingCommentId] =
    useState<string | null>(null);

  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);

  const { user } = useUser() as {
  user: {
    _id: string;
    name: string;
    image?: string;
  } | null;
};

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);

      const loadedComments = res.data.map((comment: Comment) => ({
        ...comment,
        likes: Array.isArray(comment.likes)
          ? comment.likes
          : [],
        dislikes: Array.isArray(comment.dislikes)
          ? comment.dislikes
          : []
      }));

      setComments(loadedComments);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post(
        "/comment/postcomment",
        {
          videoid: videoId,
          userid: user._id,
          commentbody: newComment.trim(),
          usercommented: user.name,
          language: language
        }
      );

      if (res.data.comment) {
        await loadComments();
      }

      setNewComment("");
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
          "Error adding comment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim() || !editingCommentId) return;

    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        {
          commentbody: editText.trim()
        }
      );

      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId
              ? {
                  ...c,
                  commentbody: editText.trim(),
                  translatedText: undefined,
                  language: undefined
                }
              : c
          )
        );

        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
          "Error updating comment"
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (
      !confirm(
        "Are you sure you want to delete this comment?"
      )
    ) {
      return;
    }

    try {
      const res = await axiosInstance.delete(
        `/comment/deletecomment/${id}`
      );

      if (res.data) {
        setComments((prev) =>
          prev.filter((c) => c._id !== id)
        );
      }
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
          "Error deleting comment"
      );
    }
  };

  const handleLike = (id: string) => {
  if (!user) {
    alert("Please login to like a comment.");
    return;
  }

  const currentUserId = String(user._id);

  setComments((prev) =>
    prev.map((comment) => {
      if (comment._id !== id) return comment;

      const likes = Array.isArray(comment.likes) ? comment.likes : [];
      const dislikes = Array.isArray(comment.dislikes) ? comment.dislikes : [];

      const alreadyLiked = likes.some(
        (userId) => String(userId) === currentUserId
      );

      if (alreadyLiked) {
        return {
          ...comment,
          likes: likes.filter(
            (userId) => String(userId) !== currentUserId
          ),
        };
      }

      return {
        ...comment,
        likes: [...likes, currentUserId],
        dislikes: dislikes.filter(
          (userId) => String(userId) !== currentUserId
        ),
      };
    })
  );
};
 const handleDislike = (id: string) => {
  if (!user) {
    alert("Please login to dislike a comment.");
    return;
  }

  const currentUserId = String(user._id);

  setComments((prev) =>
    prev.map((comment) => {
      if (comment._id !== id) return comment;

      const likes = Array.isArray(comment.likes) ? comment.likes : [];
      const dislikes = Array.isArray(comment.dislikes)
        ? comment.dislikes
        : [];

      const alreadyDisliked = dislikes.some(
        (userId) => String(userId) === currentUserId
      );

      if (alreadyDisliked) {
        return {
          ...comment,
          dislikes: dislikes.filter(
            (userId) => String(userId) !== currentUserId
          ),
        };
      }

      return {
        ...comment,
        dislikes: [...dislikes, currentUserId],
        likes: likes.filter(
          (userId) => String(userId) !== currentUserId
        ),
      };
    })
  );
};

  const handleReport = async (id: string) => {
    if (!user) {
      alert("Please login to report a comment.");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to report this comment?"
      )
    ) {
      return;
    }

    try {
      await axiosInstance.post(
        `/comment/report/${id}`,
        {
          userid: user._id
        }
      );

      alert("Comment reported for review.");
    } catch (error: any) {
      console.error("Report error:", error);

      alert(
        error.response?.data?.message ||
          "Unable to report comment."
      );
    }
  };

  const handleTranslate = async (
    id: string,
    targetLanguage: string
  ) => {
    try {
      const res = await axiosInstance.post(
        `/comment/translate/${id}`,
        {
          targetLanguage: targetLanguage
        }
      );

      setComments((prev) =>
        prev.map((c) =>
          c._id === id
            ? {
                ...c,
                translatedText:
                  res.data.translatedText,
                language: targetLanguage
              }
            : c
        )
      );

      setTranslationMenuId(null);
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
          "Translation failed"
      );
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        Loading comments...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">
        {comments.length} Comments
      </h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />

            <AvatarFallback>
              {user.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(
                e: React.ChangeEvent<HTMLTextAreaElement>
              ) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />

            <div className="flex gap-4 items-center mb-2">
              <span className="text-xs text-gray-500">
                Language:
              </span>

              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value)
                }
                className="border rounded px-2 py-1 text-xs bg-white"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
                <option value="ta">Tamil</option>
                <option value="bn">Bengali</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSubmitComment}
                disabled={
                  !newComment.trim() ||
                  isSubmitting
                }
              >
                {isSubmitting
                  ? "Posting..."
                  : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet.
          </p>
        ) : (
          comments.map((comment) => {
            const userDetails =
              comment.userid_details || {};

            const commentUserId =
              typeof comment.userid === "object"
                ? comment.userid._id
                : comment.userid;

            const isOwner =
              String(commentUserId) ===
              String(user?._id);

            const currentUserId = String(user?._id);

            const isLiked =
              !!user &&
              comment.likes?.some(
                (id) =>
                  String(id) === currentUserId
              );

            const isDisliked =
              !!user &&
              comment.dislikes?.some(
                (id) =>
                  String(id) === currentUserId
              );

            return (
              <div
                key={comment._id}
                className="flex gap-4"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />

                  <AvatarFallback>
                    {comment.usercommented?.[0] ||
                      "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.usercommented}
                    </span>

                    {userDetails.showLocation &&
                      userDetails.location && (
                        <span className="text-xs text-gray-400">
                          • {userDetails.location}
                        </span>
                      )}

                    <span className="text-xs text-gray-600">
                      {formatDistanceToNow(
                        new Date(
                          comment.commentedon
                        )
                      )}{" "}
                      ago
                    </span>
                  </div>

                  {editingCommentId ===
                  comment._id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) =>
                          setEditText(
                            e.target.value
                          )
                        }
                      />

                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={
                            handleUpdateComment
                          }
                          disabled={
                            !editText.trim()
                          }
                        >
                          Save
                        </Button>

                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(
                              null
                            );
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">
                        {comment.commentbody}
                      </p>

                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <button
                            onClick={() =>
                              handleLike(comment._id)
                            }
                            className={`flex items-center gap-1 transition-colors ${
                              isLiked
                                ? "text-blue-600 font-semibold"
                                : "hover:text-blue-600"
                            }`}
                          >
                            <ThumbsUp
                              size={14}
                              fill={
                                isLiked
                                  ? "currentColor"
                                  : "none"
                              }
                            />

                            <span>
                              {comment.likes?.length ||
                                0}
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              handleDislike(
                                comment._id
                              )
                            }
                            className={`flex items-center gap-1 transition-colors ${
                              isDisliked
                                ? "text-red-600 font-semibold"
                                : "hover:text-red-600"
                            }`}
                          >
                            <ThumbsDown
                              size={14}
                              fill={
                                isDisliked
                                  ? "currentColor"
                                  : "none"
                              }
                            />

                            <span>
                              {comment.dislikes
                                ?.length || 0}
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="relative">
                            <button
                              onClick={() =>
                                setTranslationMenuId(
                                  translationMenuId ===
                                    comment._id
                                    ? null
                                    : comment._id
                                )
                              }
                              className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                            >
                              <Languages
                                size={14}
                              />

                              Translate
                            </button>

                            {translationMenuId ===
                              comment._id && (
                              <div className="absolute left-0 top-6 z-50 bg-white border rounded-md shadow-lg p-1 min-w-[120px]">
                                <button
                                  onClick={() =>
                                    handleTranslate(
                                      comment._id,
                                      "en"
                                    )
                                  }
                                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded"
                                >
                                  English
                                </button>

                                <button
                                  onClick={() =>
                                    handleTranslate(
                                      comment._id,
                                      "hi"
                                    )
                                  }
                                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded"
                                >
                                  Hindi
                                </button>

                                <button
                                  onClick={() =>
                                    handleTranslate(
                                      comment._id,
                                      "mr"
                                    )
                                  }
                                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded"
                                >
                                  Marathi
                                </button>

                                <button
                                  onClick={() =>
                                    handleTranslate(
                                      comment._id,
                                      "ta"
                                    )
                                  }
                                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded"
                                >
                                  Tamil
                                </button>

                                <button
                                  onClick={() =>
                                    handleTranslate(
                                      comment._id,
                                      "bn"
                                    )
                                  }
                                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded"
                                >
                                  Bengali
                                </button>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              handleReport(
                                comment._id
                              )
                            }
                            className="flex items-center gap-1 hover:text-red-600 transition-colors"
                          >
                            <Flag size={14} />

                            Report
                          </button>
                        </div>

                        {isOwner && (
                          <div className="flex gap-2 ml-auto text-sm text-gray-500">
                            <button
                              className="hover:underline"
                              onClick={() =>
                                handleEdit(comment)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="hover:underline"
                              onClick={() =>
                                handleDelete(
                                  comment._id
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {comment.translatedText && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            Translated:
                          </p>

                          <p className="text-sm text-blue-600 italic">
                            {comment.translatedText}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;

