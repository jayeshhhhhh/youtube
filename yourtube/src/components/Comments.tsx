import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Flag, Languages } from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
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
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        language: language,
      });

      if (res.data.comment) {
        await loadComments();
      }

      setNewComment("");
    } catch (error: any) {
      alert(error.response?.data?.message || "Error adding comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;

    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        {
          commentbody: editText,
        }
      );

      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId
              ? { ...c, commentbody: editText }
              : c
          )
        );

        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Error updating comment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(
        `/comment/deletecomment/${id}`
      );

      if (res.data) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleLike = async (id: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/comment/like/${id}`, { userid: user._id });
      setComments((prev) =>
        prev.map((c) => (c._id === id ? { ...c, ...res.data } : c))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleDislike = async (id: string) => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/comment/dislike/${id}`, { userid: user._id });
      setComments((prev) =>
        prev.map((c) => (c._id === id ? { ...c, ...res.data } : c))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleReport = async (id: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to report this comment?")) return;
    try {
      await axiosInstance.post(`/comment/report/${id}`, { userid: user._id });
      alert("Comment reported for review.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleTranslate = async (id: string, text: string) => {
    if (comments.find(c => c._id === id)?.translatedText) {
      setComments((prev) =>
        prev.map((c) => (c._id === id ? { ...c, translatedText: undefined } : c))
      );
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/translate/${id}`, {
        targetLanguage: language,
      });

      setComments((prev) =>
        prev.map((c) =>
          c._id === id
            ? {
                ...c,
                translatedText: res.data.translatedText,
              }
            : c
        )
      );
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading comments...</div>;
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
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />

            <div className="flex gap-4 items-center mb-2">
              <span className="text-xs text-gray-500">Translate to:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="border rounded px-2 py-1 text-xs bg-white"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
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
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? "Posting..." : "Comment"}
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
            const userDetails = comment.userid_details || {};
            return (
              <div key={comment._id} className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.usercommented}
                    </span>
                    {userDetails.showLocation && userDetails.location && (
                      <span className="text-xs text-gray-400">
                        • {userDetails.location}
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      {formatDistanceToNow(new Date(comment.commentedon))} ago
                    </span>
                  </div>

                  {editingCommentId === comment._id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) =>
                          setEditText(e.target.value)
                        }
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={handleUpdateComment}
                          disabled={!editText.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{comment.commentbody}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <button
                            onClick={() => handleLike(comment._id)}
                            className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                          >
                            <ThumbsUp size={14} /> {comment.likes?.length || 0}
                          </button>
                          <button
                            onClick={() => handleDislike(comment._id)}
                            className="flex items-center gap-1 hover:text-red-500 transition-colors"
                          >
                            <ThumbsDown size={14} /> {comment.dislikes?.length || 0}
                          </button>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <button
                            onClick={() => handleTranslate(comment._id, comment.commentbody)}
                            className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          >
                            <Languages size={14} /> Translate
                          </button>
                          <button
                            onClick={() => handleReport(comment._id)}
                            className="flex items-center gap-1 hover:text-red-600 transition-colors"
                          >
                            <Flag size={14} /> Report
                          </button>
                        </div>

                        {String(comment.userid) === String(user?._id) && (
                          <div className="flex gap-2 ml-auto text-sm text-gray-500">
                            <button
                              className="hover:underline"
                              onClick={() => handleEdit(comment)}
                            >
                              Edit
                            </button>
                            <button
                              className="hover:underline"
                              onClick={() => handleDelete(comment._id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {comment.translatedText && (
                        <p className="text-sm text-blue-600 mt-1 italic">
                          {comment.translatedText}
                        </p>
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
