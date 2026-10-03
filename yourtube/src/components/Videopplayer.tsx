"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, RotateCcw, RotateCw, Maximize, Volume2, VolumeX, SkipForward, Loader2 } from "lucide-react";
import { useWatchParty } from "@/context/WatchPartyContext";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  allVideos?: any[];
}

export default function VideoPlayer({ video, allVideos }: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { socket, isHost, sendVideoAction, roomId } = useWatchParty();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Sync incoming events from Socket.io
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleSync = (data: { action: "play" | "pause" | "seek", timestamp: number }) => {
      if (!videoRef.current) return;

      const video = videoRef.current;
      if (data.action === "play") {
        video.play().catch(() => {});
        setIsPlaying(true);
      } else if (data.action === "pause") {
        video.pause();
        setIsPlaying(false);
      } else if (data.action === "seek") {
        if (Math.abs(video.currentTime - data.timestamp) > 1) {
          video.currentTime = data.timestamp;
          setCurrentTime(data.timestamp);
        }
      }
    };

    socket.on("video-sync", handleSync);
    return () => {
      socket.off("video-sync", handleSync);
    };
  }, [socket, roomId]);

  useEffect(() => {
    let controlsTimeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeout);
      controlsTimeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    if (containerRef.current) {
      containerRef.current.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("mousemove", handleMouseMove);
      }
      clearTimeout(controlsTimeout);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      const newPlayingState = !isPlaying;
      if (newPlayingState) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPlaying(newPlayingState);

      // Emit sync event if Host
      if (isHost) {
        sendVideoAction(newPlayingState ? "play" : "pause", videoRef.current.currentTime);
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);

      // Emit sync event if Host
      if (isHost) {
        sendVideoAction("seek", time);
      }
    }
  };

  const seekForward = () => handleSeek(currentTime + 10);
  const seekBackward = () => handleSeek(currentTime - 10);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapTime < DOUBLE_TAP_DELAY) {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = clientX - rect.left;
        if (x > rect.width / 2) {
          seekForward();
        } else {
          seekBackward();
        }
      }
    } else {
      setLastTapTime(now);
    }
  };

  const playNextVideo = () => {
    if (!allVideos) return;
    const currentIndex = allVideos.findIndex((v: any) => v._id === video._id);
    if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
      router.push(`/watch/${allVideos[currentIndex + 1]._id}`);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      ref={containerRef}
      className="group relative w-full aspect-video bg-black rounded-lg overflow-hidden cursor-pointer"
      onDoubleClick={handleDoubleTap}
      onTouchEnd={handleDoubleTap}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onClick={togglePlay}
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Center Play/Pause Overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
        onClick={togglePlay}
      >
        <div className="bg-black/50 p-6 rounded-full">
          {isPlaying ? (
            <Pause className="w-12 h-12 text-white fill-white" />
          ) : (
            <Play className="w-12 h-12 text-white fill-white ml-1" />
          )}
        </div>
      </div>

      {/* Bottom Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        {/* Progress Bar */}
        <div className="relative w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer group/progress"
             onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const pos = (e.clientX - rect.left) / rect.width;
               handleSeek(pos * duration);
             }}>
          <div
            className="absolute top-0 left-0 h-full bg-red-600 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
          />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="hover:text-red-500 transition-colors">
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
            </button>

            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); seekBackward(); }} className="hover:text-red-500 transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); seekForward(); }} className="hover:text-red-500 transition-colors">
                <RotateCw className="w-5 h-5" />
              </button>
            </div>

            <span className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 group/vol">
              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="hover:text-red-500 transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) videoRef.current.volume = val;
                }}
                className="w-0 group-hover/vol:w-20 transition-all duration-300 accent-red-600 h-1 cursor-pointer"
              />
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); playNextVideo(); }}
              className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold transition-colors"
            >
              Next <SkipForward className="w-3 h-3" />
            </button>

            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="hover:text-red-500 transition-colors">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
