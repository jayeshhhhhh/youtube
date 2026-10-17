
import cloudinary from "../config/cloudinary.js";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

export async function uploadVideoAndThumbnail(videoPath, originalName) {
  let thumbnailPath;

  try {
    if (!ffmpegPath) {
      throw new Error("FFmpeg binary not found.");
    }

    thumbnailPath = path.join(
      path.dirname(videoPath),
      `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    );

    try {
      await execFileAsync(ffmpegPath, [
        "-y", "-ss", "1", "-i", videoPath,
        "-frames:v", "1",
        "-vf", "scale=640:-1",
        "-q:v", "3",
        thumbnailPath,
      ]);
    } catch {
      // Fallback for videos shorter than one second.
      await execFileAsync(ffmpegPath, [
        "-y", "-i", videoPath,
        "-frames:v", "1",
        "-vf", "scale=640:-1",
        "-q:v", "3",
        thumbnailPath,
      ]);
    }

    const thumbnailFile = await fs.stat(thumbnailPath);
    if (!thumbnailFile.size) {
      throw new Error("FFmpeg generated an empty thumbnail.");
    }

    // Upload video permanently to Cloudinary.
    const videoResult = await cloudinary.uploader.upload_large(
        
      videoPath,
      {
        folder: "yourtube/videos",
        resource_type: "video",
        chunk_size: 6_000_000,
      }
    );
    
console.log("CLOUDINARY VIDEO RESULT:", videoResult);

    // Upload FFmpeg thumbnail permanently to Cloudinary.
    const thumbnailResult = await cloudinary.uploader.upload(
      thumbnailPath,
      {
        folder: "yourtube/thumbnails",
        resource_type: "image",
      }
    );

    return {
      videoUrl: videoResult.secure_url,
      videoPublicId: videoResult.public_id,
      thumbnailUrl: thumbnailResult.secure_url,
      thumbnailPublicId: thumbnailResult.public_id,
      filesize: videoResult.bytes,
    };
  } catch (error) {
    console.error("Cloudinary video/thumbnail upload failed:", error);
    throw error;
  } finally {
    if (thumbnailPath) {
      await fs.unlink(thumbnailPath).catch(() => {});
    }
  }
}
