import express from "express";
import { downloadVideo } from "../controllers/download.js";

const routes = express.Router();

routes.post("/", downloadVideo);

export default routes;