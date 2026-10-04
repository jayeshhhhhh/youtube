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

  // ================= UPDATE VIDEO DATA =================

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  // ================= VIEWS / HISTORY =================

  useEffect(() => {
    const handleviews = async () => {
      if (!video?._id) return;

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

    handleviews();
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
      console.log("Watch Later error:", error);
    }
  };

  // ================= DOWNLOAD =================

  const handleDownload = async () => {
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

      // 1. Check plan limits via backend before allowing download
      const checkRes = await axiosInstance.post("/video/request-download", {
        userId: user._id,
        videoId: video._id,
      });

      if (checkRes.data.success) {
        // 2. If backend approves, trigger the actual file download
        window.location.assign(`${process.env.NEXT_PUBLIC_BACKEND_URL}/video/download/${video._id}?userId=${user._id}`);
      } else {
        // 3. Handle limit reached (e.g., Free user reached 1/day)
        alert(checkRes.data.message || "Download limit reached for your current plan.");
        if (confirm("Would you like to upgrade your plan to download more videos?")) {
          window.location.href = "/upgrade";
        }
      }
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

  // ================= UI =================

  return (
    <>
      {/* VIDEO TITLE */}
      <h1 className="text-xl font-semibold text-foreground mb-4">
        {video.videotitle}
      </h1>

      {/* CHANNEL + BUTTONS */}
      <div className="flex items-center justify-between">
        {/* CHANNEL */}
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>
              {video.videochanel?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="font-medium">{video.videochanel}</h3>

            <p className="text-sm text-gray-600">
              1.2M subscribers
            </p>
          </div>

          <Button className="ml-4">
            Subscribe
          </Button>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2">

          {/* LIKE + DISLIKE */}
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

      {/* DESCRIPTION / VIEWS */}
      <div className="bg-gray-100 rounded-lg p-4 mt-4">

        <div className="flex gap-4 text-sm font-medium mb-2">

          <span>
            {video.views?.toLocaleString() || 0} views
          </span>

          <span>
            {video.createdAt
              ? formatDistanceToNow(
                  new Date(video.createdAt)
                )
              : "Recently"}{" "}
            ago
          </span>

        </div>

        <div
          className={`text-sm ${
            showFullDescription
              ? ""
              : "line-clamp-3"
          }`}
        >
          <p>
            Sample video description. This would contain
            the actual video description from the database.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() =>
            setShowFullDescription(
              !showFullDescription
            )
          }
        >
          {showFullDescription
            ? "Show less"
            : "Show more"}
        </Button>
      </div>
    </>
  );
};

export default VideoInfo;
