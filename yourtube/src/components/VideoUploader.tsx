import { Check, FileVideo, Upload, X } from "lucide-react";
import React, { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

interface VideoUploaderProps {
  channelId: string;
  channelName: string;
}

const VideoUploader = ({
  channelId,
  channelName,
}: VideoUploaderProps) => {
  const { user } = useUser();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [uploadComplete, setUploadComplete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a valid video file.");
      e.target.value = "";
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size exceeds 100MB limit.");
      e.target.value = "";
      return;
    }

    setVideoFile(file);
    setVideoTitle((previous) => previous || file.name);
    setUploadComplete(false);
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setUploadProgress(0);
    setUploadComplete(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    if (isUploading) {
      toast.error("Upload is already in progress.");
      return;
    }

    resetForm();
  };

  const handleUpload = async () => {
    // Capture and validate the logged-in user.
    const currentUser = user;

    if (!currentUser?._id) {
      toast.error("Please login before uploading.");
      return;
    }

    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide a video file and title.");
      return;
    }

    if (!channelId || !channelName) {
      toast.error("Channel information is missing.");
      return;
    }

    const formData = new FormData();
    formData.append("file", videoFile);
    formData.append("videotitle", videoTitle.trim());
    formData.append("videochanel", channelName);
    formData.append("uploader", channelId);
    formData.append("userId", String(currentUser._id));

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const response = await axiosInstance.post(
        "/video/upload",
        formData,
        {
          onUploadProgress: (event) => {
            if (event.total) {
              const progress = Math.round(
                (event.loaded * 100) / event.total
              );
              setUploadProgress(progress);
            }
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Video upload failed."
        );
      }

      setUploadProgress(100);
      setUploadComplete(true);
      toast.success("Video uploaded successfully!");

      resetForm();
    } catch (error: any) {
      console.error(
        "Video upload error:",
        error.response?.data || error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Video upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-lg bg-gray-50 p-6 dark:bg-zinc-900">
      <h2 className="mb-4 font-semibold text-black dark:text-white">
        Upload a video
      </h2>

      <div className="space-y-4">
        {!videoFile ? (
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            onClick={() => {
              if (!isUploading) fileInputRef.current?.click();
            }}
          >
            <Upload className="mx-auto mb-2 h-12 w-12 text-gray-400" />

            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Drag and drop video files to upload
            </p>

            <p className="mt-1 text-sm text-gray-500">
              or click to select files
            </p>

            <p className="mt-4 text-xs text-gray-400">
              MP4, WebM, MOV or AVI • Up to 100MB
            </p>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="rounded-md bg-blue-100 p-2">
                <FileVideo className="h-6 w-6 text-blue-600" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-black dark:text-white">
                  {videoFile.name}
                </p>

                <p className="text-sm text-gray-500">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>

              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={cancelUpload}
                  aria-label="Remove selected video"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}

              {uploadComplete && (
                <Check className="h-5 w-5 text-green-600" />
              )}
            </div>

            <div>
              <Label htmlFor="video-title">Title (required)</Label>

              <Input
                id="video-title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Add a title that describes your video"
                disabled={isUploading}
                className="mt-1 text-black dark:text-white"
              />
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>

                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={cancelUpload}
                disabled={isUploading}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !videoTitle.trim()}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;