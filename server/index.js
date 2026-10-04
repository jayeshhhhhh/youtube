import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import path from "path";

dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));

app.get("/", (req, res) => {
  res.send("You tube backend is working");
});

app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);

// --- Watch Party Socket Logic ---
const rooms = new Map(); // roomId -> { hostId, participants: Set }

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { hostId: socket.id, participants: new Set() });
    }

    const room = rooms.get(roomId);
    room.participants.add(socket.id);

    console.log(`User ${userId} joined room ${roomId}`);

    // Notify others in the room
    socket.to(roomId).emit("user-connected", { userId, socketId: socket.id });

    // Send current participant list to the new user
    socket.emit("room-participants", Array.from(room.participants));
  });

  socket.on("video-action", ({ roomId, action, timestamp }) => {
    // Broadcast video action to everyone else in the room
    // action: 'play' | 'pause' | 'seek'
    socket.to(roomId).emit("video-sync", { action, timestamp });
  });

  socket.on("send-message", ({ roomId, message, user }) => {
    // Broadcast chat message to everyone in the room
    io.to(roomId).emit("receive-message", {
      user,
      message,
      timestamp: new Date(),
    });
  });

  socket.on("peer-signal", ({ roomId, targetPeerId, signal }) => {
    // Relay PeerJS signaling data to a specific user
    socket.to(roomId).emit("peer-signal", {
      senderPeerId: socket.id,
      targetPeerId,
      signal,
    });
  });

  socket.on("disconnect", () => {
    rooms.forEach((room, roomId) => {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        io.to(roomId).emit("user-disconnected", socket.id);
        if (room.participants.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const DBURL = process.env.DB_URL;
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
