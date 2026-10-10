import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import multer from "multer";

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import dislikeroutes from "./routes/dislike.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

const UPLOAD_DIR = path.join(__dirname, "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || "").split(",").map(url => url.trim()),
  "http://localhost:3000",
  "https://youtube-six-flame.vercel.app",
].filter(Boolean)

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.use("/uploads", express.static(UPLOAD_DIR));


const io = new Server(httpServer, {
  cors: {
    origin: [
      "https://youtube-six-flame.vercel.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});


app.set("io", io);

app.get("/", (req, res) => {
  res.send("YouTube backend and Watch Party are running");
});

// Keep all existing APIs
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);
app.use("/dislike", dislikeroutes);

// ------------------------------------------
// VIDEO UPLOAD
// ------------------------------------------

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName =
      Date.now() + "-" + Math.random().toString(36).slice(2, 10);

    cb(null, safeName + extension);
  },
});

const allowedExtensions = new Set([
  ".mp4",
  ".webm",
  ".ogg",
  ".ogv",
  ".mov",
  ".m4v",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      cb(new Error("Choose a supported video file."));
      return;
    }

    cb(null, true);
  },
});

app.post("/watch-party/upload", (req, res) => {
  upload.single("video")(req, res, (error) => {
    if (error) {
      const message =
        error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
          ? "Video exceeds the 500 MB upload limit."
          : error.message || "Video upload failed.";

      res.status(400).json({ error: message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Select a video first." });
      return;
    }

    res.json({
      success: true,
      videoUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
    });
  });
});

// ------------------------------------------
// WATCH PARTY
// ------------------------------------------

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      hostId: null,
      participants: new Map(),
      videoUrl: "",
      playback: {
        action: "pause",
        timestamp: 0,
        updatedAt: Date.now(),
      },
    });
  }

  return rooms.get(roomId);
}

function sendParticipants(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  io.to(roomId).emit(
    "room-participants",
    Array.from(room.participants.values())
  );
}

function removeFromRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.participants.delete(socket.id);

  if (room.hostId === socket.id) {
    room.hostId = room.participants.keys().next().value || null;
  }

  io.to(roomId).emit("user-disconnected", socket.id);
  sendParticipants(roomId);

  if (room.participants.size === 0) {
    rooms.delete(roomId);
  }
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join-room", (data = {}, callback) => {
    const roomId =
      typeof data.roomId === "string" ? data.roomId.trim() : "";

    if (!roomId || roomId.length > 100) {
      callback?.({ ok: false, error: "Invalid room code." });
      return;
    }

    // Avoid joining the same room twice.
    if (socket.rooms.has(roomId)) {
      const existingRoom = rooms.get(roomId);

      callback?.({
        ok: true,
        roomId,
        isHost: existingRoom?.hostId === socket.id,
      });

      return;
    }

    // Leave other watch-party rooms.
    for (const oldRoomId of [...(socket.data.watchRooms || [])]) {
      socket.leave(oldRoomId);
      removeFromRoom(socket, oldRoomId);
    }

    const room = getRoom(roomId);

    if (!room.hostId) {
      room.hostId = socket.id;
    }

    const participant = {
      socketId: socket.id,
      userId: String(data.userId || socket.id),
      userName: String(data.userName || "Guest").slice(0, 40),
    };

    socket.join(roomId);
    socket.data.watchRooms = [roomId];
    room.participants.set(socket.id, participant);

    socket.emit("room-state", {
      videoUrl: room.videoUrl,
      playback: room.playback,
    });

    socket.to(roomId).emit("user-connected", participant);

    sendParticipants(roomId);

    callback?.({
      ok: true,
      roomId,
      isHost: room.hostId === socket.id,
    });

    console.log(`${participant.userName} joined ${roomId}`);
  });

  // Only the room host can choose/change the shared video.
  socket.on("change-video", ({ roomId, videoUrl } = {}, callback) => {
    const room = rooms.get(roomId);

    if (!room || !socket.rooms.has(roomId)) return;

    if (room.hostId !== socket.id) {
      callback?.({
        ok: false,
        error: "Only the host can change the video.",
      });
      return;
    }

    if (
      typeof videoUrl !== "string" ||
      !videoUrl.startsWith("/uploads/") ||
      videoUrl.includes("..")
    ) {
      callback?.({
        ok: false,
        error: "Invalid uploaded video URL.",
      });
      return;
    }

    room.videoUrl = videoUrl;
    room.playback = {
      action: "pause",
      timestamp: 0,
      updatedAt: Date.now(),
    };

    io.to(roomId).emit("video-changed", {
      videoUrl: room.videoUrl,
      playback: room.playback,
    });

    callback?.({ ok: true });
  });

  socket.on("video-action", ({ roomId, action, timestamp } = {}) => {
    const room = rooms.get(roomId);

    if (!room || !socket.rooms.has(roomId)) return;

    if (!["play", "pause", "seek"].includes(action)) return;

    const time = Number(timestamp);

    if (!Number.isFinite(time) || time < 0) return;

    room.playback = {
      action,
      timestamp: time,
      updatedAt: Date.now(),
    };

    socket.to(roomId).emit("video-sync", room.playback);
  });

  socket.on("send-message", ({ roomId, message } = {}) => {
    
  // WEBRTC SIGNALING
  const relayWebRTC = (eventName, payload = {}) => {
    const { roomId, to, ...data } = payload;

    if (typeof roomId !== "string" || typeof to !== "string") return;

    const room = rooms.get(roomId);
    const target = io.sockets.sockets.get(to);

    if (!room || !socket.rooms.has(roomId)) return;
    if (!room.participants.has(to)) return;
    if (!target || !target.rooms.has(roomId)) return;

    target.emit(eventName, {
      ...data,
      roomId,
      from: socket.id,
    });
  };

  socket.on("webrtc-offer", (payload) =>
    relayWebRTC("webrtc-offer", payload)
  );

  socket.on("webrtc-answer", (payload) =>
    relayWebRTC("webrtc-answer", payload)
  );

  socket.on("webrtc-ice-candidate", (payload) =>
    relayWebRTC("webrtc-ice-candidate", payload)
  );

    const room = rooms.get(roomId);

    if (!room || !socket.rooms.has(roomId)) return;
    if (typeof message !== "string") return;

    const cleanMessage = message.trim().slice(0, 1000);
    if (!cleanMessage) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    io.to(roomId).emit("receive-message", {
      id: `${socket.id}-${Date.now()}-${Math.random()}`,
      user: participant.userName,
      userId: participant.userId,
      message: cleanMessage,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("leave-room", ({ roomId } = {}) => {
    if (!roomId || !socket.rooms.has(roomId)) return;

    socket.leave(roomId);

    socket.data.watchRooms = (socket.data.watchRooms || []).filter(
      (id) => id !== roomId
    );

    removeFromRoom(socket, roomId);
  });

  socket.on("disconnect", () => {
    for (const roomId of socket.data.watchRooms || []) {
      removeFromRoom(socket, roomId);
    }

    console.log("Disconnected:", socket.id);
  });
});

// ------------------------------------------
// START SERVER
// ------------------------------------------

async function startServer() {
  try {
    if (process.env.DB_URL) {
      await mongoose.connect(process.env.DB_URL);
      console.log("MongoDB connected");
    } else {
      console.warn("DB_URL missing; database features will not work.");
    }

    const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exit(1);
  }
}

startServer();