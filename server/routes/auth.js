import express from "express";
import { login, updateprofile, getUserDownloads } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.get("/downloads", getUserDownloads);

export default routes;
