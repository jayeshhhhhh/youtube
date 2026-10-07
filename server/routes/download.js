import express from "express";

import {
  downloadVideo,
  getUserDownloads,
} from "../controllers/download.js";

const routes = express.Router();

routes.post("/", downloadVideo);

routes.get("/:userId", getUserDownloads);

export default routes;