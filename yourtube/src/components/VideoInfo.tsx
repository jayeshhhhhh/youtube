import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { user } = useUser();

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  // ================= VIEWS / HISTORY =================

  useEffect(() => {
    const handleviews = async () => {
      try {
        if (user) {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: user._id,
          });
        } else {
          await axiosInstance.post(`/history/views/${video._id}`);
        }
      } catch (error) {
        console.log("View error:", error);
      }
    };

    if (video?._id) {
      handleviews();
    }
  }, [user, video]);

  // ================= LIKE =================

  const handleLike = async () => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user._id,
      });

      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: number) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: number) => prev + 1);
          setIsLiked(true);

          if (isDisliked) {
            setDislikes((prev: number) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log("Like error:", error);
    }
  };

  // ================= DISLIKE =================

  const handleDislike = async () => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user._id,
      });

      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: number) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: number) => prev + 1);
          setIsDisliked(true);

          if (isLiked) {
            setlikes((prev: number) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log("Dislike error:", error);
    }
  };

  // ================= WATCH LATER =================

  const handleWatchLater = async () => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user._id,
      });

      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log("Watch later error:", error);
    }
  };

  // ================= DOWNLOAD =================

  const handleDownload = async () => {
    console.log("DOWNLOAD BUTTON CLICKED");

    if (!user) {
      alert("Please login to download videos.");
      return;
    }

    if (!video?._id) {
      alert("Video information is missing.");
      return;
    }

    try {
      setIsDownloading(true);

      console.log("User ID:", user._id);
      console.log("Video ID:", video._id);

      const response = await axiosInstance.post("/download", {
        userId: user._id,
        videoId: video._id,
      });

      console.log("Download API response:", response.data);

      if (!response.data?.fileUrl) {
        alert("Download link was not received.");
        return;
      }

      const link = document.createElement("a");

      link.href = response.data.fileUrl;
      link.download = video.filename || "video.mp4";
      link.target = "_blank";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Download started successfully");
    } catch (error: any) {
      console.error("DOWNLOAD ERROR:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to download video.";

      alert(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* VIDEO TITLE */}
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      {/* CHANNEL + ACTION BUTTONS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>
              {video.videochanel?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>

          <Button className="ml-4">Subscribe</Button>
        </div>

        <div className="flex items-center gap-2">
          {/* LIKE / DISLIKE */}
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>

            <div className="w-px h-6 bg-gray-300" />

            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>

          {/* WATCH LATER */}
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>

          {/* SHARE */}
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>

          {/* DOWNLOAD */}
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="w-5 h-5 mr-2" />

            {isDownloading ? "Downloading..." : "Download"}
          </Button>

          {/* MORE */}
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* VIDEO DETAILS */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views?.toLocaleString() || 0} views</span>

          <span>
            {video.createdAt
              ? formatDistanceToNow(new Date(video.createdAt))
              : "Recently"}{" "}
            ago
          </span>
        </div>

        <div
          className={`text-sm ${
            showFullDescription ? "" : "line-clamp-3"
          }`}
        >
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() =>
            setShowFullDescription(!showFullDescription)
          }
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;