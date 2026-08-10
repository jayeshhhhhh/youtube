"use client";

import { useRef } from "react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();

  const handleDownload = async () => {
     console.log("DOWNLOAD BUTTON CLICKED");
  
  if (!user) {
    console.log("USER IS NULL", user);
    alert("Please login to download videos.");
    return;
  }

  console.log("USER:", user);
  console.log("VIDEO:", video);
    if (!user) {
      alert("Please login to download videos.");
      return;
    }

    try {
      const response = await axiosInstance.post("/download", {
        userId: user._id,
        videoId: video._id,
      });

      if (response.data?.fileUrl) {
        const link = document.createElement("a");

        link.href = response.data.fileUrl;
        link.download = video.videotitle || "video";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      console.error("Download error:", error);

      alert(
        error.response?.data?.message ||
          "Unable to download this video."
      );
    }
  };

  return (
    <div className="w-full">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath}`}
          type="video/mp4"
        />

        Your browser does not support the video tag.
      </video>

      <div className="mt-3">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Download
        </button>
      </div>
    </div>
  );
}