import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  translateComment,
} from "../controllers/comment.js";

const routes = express.Router();

routes.get("/:videoid", getallcomment);

routes.post("/postcomment", postcomment);

routes.delete("/deletecomment/:id", deletecomment);

routes.post("/editcomment/:id", editcomment);
routes.post("/translate/:id", translateComment);

routes.patch("/like/:id", likeComment);

routes.patch("/dislike/:id", dislikeComment);

export default routes;