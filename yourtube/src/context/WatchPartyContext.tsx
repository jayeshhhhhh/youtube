"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Peer from "peerjs";

interface WatchPartyState {
  socket: Socket | null;
  peer: Peer | null;
  roomId: string | null;
  isHost: boolean;
  participants: any[];
  myPeerId: string | null;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  sendVideoAction: (action: "play" | "pause" | "seek", timestamp: number) => void;
  sendMessage: (message: string, user: any) => void;
}

const WatchPartyContext = createContext<WatchPartyState | undefined>(undefined);

export const WatchPartyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const joinRoom = async (id: string) => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000");
    socketRef.current = newSocket;
    setSocket(newSocket);
    setRoomId(id);

    newSocket.emit("join-room", { roomId: id, userId: "current-user-id" });

    newSocket.on("room-participants", (list: any[]) => {
      setParticipants(list);
      // First person in the list is considered host
      setIsHost(list[0] === newSocket.id);
    });

    newSocket.on("user-connected", (user: any) => {
      setParticipants((prev) => [...prev, user]);
    });

    newSocket.on("user-disconnected", (socketId: string) => {
      setParticipants((prev) => prev.filter((p) => p !== socketId));
    });
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setSocket(null);
      setRoomId(null);
      setIsHost(false);
      setParticipants([]);
    }
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
  };

  const sendVideoAction = (action: "play" | "pause" | "seek", timestamp: number) => {
    if (socketRef.current) {
      socketRef.current.emit("video-action", {
        roomId,
        action,
        timestamp,
      });
    }
  };

  const sendMessage = (message: string, user: any) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("send-message", {
        roomId,
        message,
        user,
      });
    }
  };

  useEffect(() => {
    // Initialize PeerJS
    const newPeer = new Peer();
    newPeer.on("open", (id) => {
      setMyPeerId(id);
    });
    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  return (
    <WatchPartyContext.Provider
      value={{
        socket,
        peer,
        roomId,
        isHost,
        participants,
        myPeerId,
        joinRoom,
        leaveRoom,
        sendVideoAction,
        sendMessage,
      }}
    >
      {children}
    </WatchPartyContext.Provider>
  );
};

export const useWatchParty = () => {
  const context = useContext(WatchPartyContext);
  if (!context) throw new Error("useWatchParty must be used within a WatchPartyProvider");
  return context;
};
