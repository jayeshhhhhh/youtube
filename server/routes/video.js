import express from "express";
import {
  getallvideo,
  uploadvideo,
  streamVideo,
  deleteVideo,
  downloadVideo,
} from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

// Route to upload video
routes.post("/upload", upload.single("file"), uploadvideo);

// Route to get all videos
routes.get("/getall", getallvideo);

// Route to stream video (This is the one that makes the video play)
routes.get("/stream/:id", streamVideo);
routes.get("/download/:id", downloadVideo);
// Route to delete video
routes.delete("/:id", deleteVideo);

export default routes;