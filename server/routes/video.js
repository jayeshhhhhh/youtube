
import express from "express";
import {
  getallvideo,
  uploadvideo,
  downloadVideo,
  streamVideo,
  deleteVideo,
} from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), uploadvideo);
routes.get("/getall", getallvideo);
routes.get("/stream/:id", streamVideo);
routes.get("/download/:id", downloadVideo);
routes.delete("/:id", deleteVideo);

export default routes;
