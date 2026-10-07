"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";

import {
  Download,
  Calendar,
  Video,
  User,
  CreditCard,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Check,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ScrollArea } from "@/components/ui/scroll-area";

interface DownloadRecord {
  _id: string;
  videoTitle: string;
  thumbnail?: string;
  downloadDate: string;
  fileSize?: string;
  planAtDownload?: string;
  downloadCount?: number;
}

interface VideoInfoProps {
  video?: any;
}

export default function ProfilePage({ video }: VideoInfoProps) {
  const { user } = useUser();

  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");
  const [dailyLimit, setDailyLimit] = useState(1);
  const [todayDownloads, setTodayDownloads] = useState(0);
  const [remainingDownloads, setRemainingDownloads] = useState(1);

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [watchLater, setWatchLater] = useState(false);

  const [likeCount, setLikeCount] = useState(video?.Like || 0);
  const [dislikeCount, setDislikeCount] = useState(
    video?.Dislike || 0
  );

  const [downloading, setDownloading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        const res = await axiosInstance.get(
          `/download/${user._id}`
        );

        setDownloads(res.data.downloads || []);
        setPlan(res.data.plan || "free");
        setDailyLimit(res.data.dailyLimit || 1);
        setTodayDownloads(res.data.todayDownloads || 0);
        setRemainingDownloads(
          res.data.remainingDownloads ?? 0
        );
      } catch (error) {
        console.error("Error fetching downloads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDownloads();
  }, [user]);

  useEffect(() => {
    if (!user?._id || !video?._id) return;

    const loadVideoStatus = async () => {
      try {
        const [likeRes, watchRes, dislikeRes] =
          await Promise.all([
            axiosInstance.get(`/like/${user._id}`),
            axiosInstance.get(`/watch/${user._id}`),
            axiosInstance.get(`/dislike/${user._id}`),
          ]);

        const isLiked = likeRes.data?.some(
          (item: any) =>
            item.videoid?._id === video._id ||
            item.videoid === video._id
        );

        const isWatchLater = watchRes.data?.some(
          (item: any) =>
            item.videoid?._id === video._id ||
            item.videoid === video._id
        );

        const isDisliked = dislikeRes.data?.some(
          (item: any) =>
            item.videoid?._id === video._id ||
            item.videoid === video._id
        );

        setLiked(isLiked);
        setWatchLater(isWatchLater);
        setDisliked(isDisliked);
      } catch (error) {
        console.error(
          "Error loading video status:",
          error
        );
      }
    };

    loadVideoStatus();
  }, [user?._id, video?._id]);

  useEffect(() => {
    if (video) {
      setLikeCount(video.Like || 0);
      setDislikeCount(video.Dislike || 0);
    }
  }, [video]);

  const handleLike = async () => {
    if (!user?._id || !video?._id) {
      alert("Please login first");
      return;
    }

    try {
      const res = await axiosInstance.post(
        `/like/${video._id}`,
        {
          userId: user._id,
        }
      );

      setLiked(res.data.liked);

      setLikeCount((prev: number) =>
        res.data.liked
          ? prev + 1
          : Math.max(0, prev - 1)
      );

      if (res.data.liked && disliked) {
        setDisliked(false);
        setDislikeCount((prev: number) =>
          Math.max(0, prev - 1)
        );
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const handleDislike = async () => {
    if (!user?._id || !video?._id) {
      alert("Please login first");
      return;
    }

    try {
      const res = await axiosInstance.post(
        `/dislike/${video._id}`,
        {
          userId: user._id,
        }
      );

      setDisliked(res.data.disliked);

      setDislikeCount((prev: number) =>
        res.data.disliked
          ? prev + 1
          : Math.max(0, prev - 1)
      );

      if (res.data.disliked && liked) {
        setLiked(false);
        setLikeCount((prev: number) =>
          Math.max(0, prev - 1)
        );
      }
    } catch (error) {
      console.error("Dislike error:", error);
    }
  };

  const handleWatchLater = async () => {
    if (!user?._id || !video?._id) {
      alert("Please login first");
      return;
    }

    try {
      const res = await axiosInstance.post(
        `/watch/${video._id}`,
        {
          userId: user._id,
        }
      );

      setWatchLater(res.data.watchlater);
    } catch (error) {
      console.error(
        "Watch later error:",
        error
      );
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;

      if (navigator.share) {
        await navigator.share({
          title: video?.videotitle,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Video link copied!");
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleDownloadVideo = async () => {
    if (!user?._id || !video?._id) {
      alert("Please login first");
      return;
    }

    try {
      setDownloading(true);

      const response = await axiosInstance.get(
        `/video/download/${video._id}?userId=${user._id}`,
        {
          responseType: "blob",
        }
      );
if (response.status === 403) {
  alert("Daily download limit reached. You cannot download more videos today.");
  return;
}
      const blob = new Blob([response.data], {
        type: "video/mp4",
      });

      const url =
        window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download =
        video.filename ||
        `${video.videotitle}.mp4`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    }  catch (error) {
  alert("Download failed. Please try again.");
} finally {
  setDownloading(false);
}
  };

  const handleSubscribe = () => {
    setSubscribed((prev) => !prev);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">
          Please login to view your profile.
        </p>
      </div>
    );
  }

  const planName =
    plan.charAt(0).toUpperCase() +
    plan.slice(1);

  const percentage =
    dailyLimit > 0
      ? Math.min(
          (todayDownloads / dailyLimit) * 100,
          100
        )
      : 0;

  return (
    <div className="container mx-auto py-12 px-4 space-y-8">

      {video && (
        <div className="space-y-4">

          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              {video.videotitle}
            </h2>

            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span>
                {video.views || 0} views
              </span>

              <span>•</span>

              <span>
                {video.createdAt
                  ? new Date(
                      video.createdAt
                    ).toLocaleDateString()
                  : "Unknown date"}
              </span>
            </div>
          </div>

<div className="flex flex-nowrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={20} />
              </div>

              <div>
                <p className="font-semibold">
                  {video.videochanel ||
                    "Unknown Channel"}
                </p>

                <p className="text-xs text-gray-500">
                  {video.subscriberCount || 0} subscribers
                </p>
              </div>

              <Button 
              className="hover:!bg-[#3b2418] hover:!border-[#3b2418] hover:!  text-black"
                variant={
                  
                  subscribed
                    ? "default"
                    : "outline"
                }
                onClick={handleSubscribe}
          
              >
                {subscribed
                  ? "Subscribed"
                  : "Subscribe"}
              </Button>

            </div>

<div className="flex flex-nowrap gap-2">
              <Button
             className="hover:!bg-[#3b2418] hover:!border-[#3b2418] hover:!text-white"
                variant={
                  liked
                    ? "default"
                    : "outline"
                }
                onClick={handleLike}
              >
                <ThumbsUp 
                className="hover:!bg-[#3b2418] hover:!border-[#3b2418] hover:!text-white"
                 
                  fill={
                    liked
                      ? "currentColor"
                      : "none"
                  }
                />
                {likeCount}
              </Button>

              <Button className="hover:!bg-[#3b2418] hover:!border-[#3b2418] hover:!text-white"
                variant={
                  disliked
                    ? "default"
                    : "outline"
                }
                onClick={handleDislike}
              >
                <ThumbsDown
                  className="w-4 h-4 mr-2 hover:!bg-[#3b2418] hover:!border-[#3b2418] hover:!text-white"
                  fill={
                    disliked
                      ? "currentColor"
                      : "none"
                  }
                />
                {dislikeCount}
              </Button>

              <Button className="hover:!bg-[#3b2418] hover:!border-[#3b2418] hover:!text-white"
                variant="outline"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>

              <Button className="hover:!bg-[#3b2418] hover:!border-[#3b2418] hover:!text-white"
                variant={
                  watchLater
                    ? "default"
                    : "outline"
                }
                onClick={handleWatchLater}
              >
                {watchLater ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Bookmark className="w-4 h-4 mr-2" />
                )}

                {watchLater
                  ? "Saved"
                  : "Watch Later"}
              </Button>

              <Button 
              className="hover:!bg-[#3b2418] hover:!border-[#3b2418] hover:!text-white"
                variant="outline"
                disabled={downloading}
                onClick={handleDownloadVideo}
              >
                <Download className="w-4 h-4 mr-2" />

                {downloading
                  ? "Downloading..."
                  : "Download"}
              </Button>

            </div>
          </div>

          <div className="rounded-lg bg-gray-100 dark:bg-zinc-300 p-4">

            <p className="font-semibold">
              {video.videochanel ||
                "Unknown Channel"}
            </p>

            <p className="text-sm text-black mt-1">
              {video.description ||
                "No description available."}
            </p>

          </div>
        </div>
      )}

      <div className="flex items-center gap-6 mb-8">

        <div className="w-18 h-18 rounded-full bg-primary flex items-center justify-center text-black text-xl font-bold border-4 border-white shadow-lg">
          {user.name?.[0] || "U"}
        </div>

        <div>
          <h1 className="text-3xl font-bold">
            {user.name}
          </h1>

          <p className="text-gray-500">
            {user.email}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase">
              {planName} Plan
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <Card className="h-fit">

          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              Account Details
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Joined
              </span>

              <span>
                {user.joinedon
                  ? new Date(
                      user.joinedon
                    ).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Plan
              </span>

              <span className="font-medium capitalize">
                {plan}
              </span>
            </div>

            <div className="border-t pt-4">

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">
                  Downloads Today
                </span>

                <span className="font-semibold">
                  {todayDownloads} / {dailyLimit}
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">

                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${percentage}%`,
                  }}
                />

              </div>

              <p className="text-xs text-gray-500 mt-2">
                {remainingDownloads > 0
                  ? `${remainingDownloads} download${
                      remainingDownloads !== 1
                        ? "s"
                        : ""
                    } remaining today`
                  : "Daily download limit reached"}
              </p>

            </div>

            <Button
              variant="outline"
              className="w-full mt-4 hover:bg-[#3b2418] hover:border-[#3b2418] hover:text-white"
              onClick={() =>
                (window.location.href =
                  "/upgrade")
              }
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>

          </CardContent>

        </Card>

        <Card className="md:col-span-2 h-fit">

          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={20} />
              Download History
            </CardTitle>
          </CardHeader>

          <CardContent>

            {loading ? (

              <p className="text-center text-gray-500">
                Loading downloads...
              </p>

            ) : downloads.length === 0 ? (

              <div className="text-center py-8">

                <Download
                  size={40}
                  className="mx-auto mb-3 text-gray-400"
                />

                <p className="text-gray-500">
                  No downloaded videos found.
                </p>

              </div>

            ) : (

              <ScrollArea className="h-[220px] pr-4">

                <div className="space-y-3">

                  {downloads.map((dl) => (

                    <div
                      key={dl._id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700"
                    >

                      <div className="flex items-center gap-3 min-w-0">

                        <div className="w-24 h-14 rounded overflow-hidden bg-gray-200 dark:bg-zinc-700 flex-shrink-0">

                          {dl.thumbnail ? (

                            <img
                              src={dl.thumbnail}
                              alt={dl.videoTitle}
                              className="w-full h-full object-cover"
                            />

                          ) : (

                            <div className="w-full h-full flex items-center justify-center">
                              <Video size={20} />
                            </div>

                          )}

                        </div>

                        <div className="min-w-0">

                          <p className="text-sm font-medium truncate">
                            {dl.videoTitle}
                          </p>

                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Calendar size={10} />

                            {new Date(
                              dl.downloadDate
                            ).toLocaleDateString()}
                          </p>

                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock size={10} />

                            {new Date(
                              dl.downloadDate
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>

                          <p className="text-[10px] text-gray-500">
                            {dl.fileSize ||
                              "Size unavailable"}
                          </p>

                        </div>

                        <div className="flex flex-col items-end gap-2 ml-2">

                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                            {dl.planAtDownload ||
                              "free"}
                          </span>

                          <span className="text-[10px] text-gray-500">
                            Download #
                            {dl.downloadCount ||
                              1}
                          </span>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </ScrollArea>

            )}

          </CardContent>

        </Card>

      </div>

    </div>
  );
}