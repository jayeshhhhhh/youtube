import express from "express";
import {
  handledislike,
  getallDislikedVideo,
} from "../controllers/dislike.js";

const routes = express.Router();

routes.get("/:userId", getallDislikedVideo);
routes.post("/:videoId", handledislike);

export default routes;