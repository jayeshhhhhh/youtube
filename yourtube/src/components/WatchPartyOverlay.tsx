"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWatchParty } from "@/context/WatchPartyContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Send,
  Monitor,
} from "lucide-react";

interface WatchPartyOverlayProps {
  user: any;
}

export default function WatchPartyOverlay({
  user,
}: WatchPartyOverlayProps) {
  const {
    socket,
    peer,
    participants,
    sendMessage,
    myPeerId,
    leaveRoom,
  } = useWatchParty();

  const [messages, setMessages] = useState<
    { user: string; text: string; time: any }[]
  >([]);

  const [inputMessage, setInputMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const getLocalStream = async (): Promise<MediaStream | null> => {
    try {
      if (localStreamRef.current) {
        return localStreamRef.current;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Media access denied", error);
      return null;
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data: any) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleUserConnected = async (data: any) => {
      if (!peer || !myPeerId) return;

      const stream = await getLocalStream();

      if (!stream) return;

      const call = peer.call(data.socketId, stream);

      call.on("stream", (remoteStream: MediaStream) => {
        setRemoteStreams((prev) => ({
          ...prev,
          [data.socketId]: remoteStream,
        }));
      });

      call.on("close", () => {
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[data.socketId];
          return updated;
        });
      });
    };

    socket.on("receive-message", handleMessage);
    socket.on("user-connected", handleUserConnected);

    return () => {
      socket.off("receive-message", handleMessage);
      socket.off("user-connected", handleUserConnected);
    };
  }, [socket, peer, myPeerId]);

  useEffect(() => {
    const initializeLocalStream = async () => {
      await getLocalStream();
    };

    initializeLocalStream();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });

        localStreamRef.current = null;
      }
    };
  }, []);

  const handleSend = () => {
    if (!inputMessage.trim()) return;

    sendMessage(inputMessage, user.name || "Anonymous");
    setInputMessage("");
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;

    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];

    if (!audioTrack) return;

    audioTrack.enabled = isMuted;
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;

    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) return;

    videoTrack.enabled = isVideoOff;
    setIsVideoOff(!isVideoOff);
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen share and return to camera
        const stream = await getLocalStream();
        if (stream && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Update all active peer calls with the camera stream
        if (peer) {
          // In a real production app, we'd iterate over active RTCPeerConnections
          // and use replaceTrack(). For this PeerJS implementation, we re-call
          // participants or signal a stream update.
          socket.emit("signal-stream-update", {
            roomId: socket.id,
            type: "camera"
          });
        }

        setIsScreenSharing(false);
      } else {
        // Start screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Update localStreamRef so that future calls use the screen
        localStreamRef.current = screenStream;

        // Notify others that we are now sharing screen
        socket.emit("signal-stream-update", {
          roomId: socket.id,
          type: "screen"
        });

        setIsScreenSharing(true);

        // Handle "Stop sharing" button from browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      }
    } catch (error) {
      console.error("Screen share error:", error);
      alert("Could not share screen. Please check permissions.");
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex items-end justify-end p-6 z-50">
      <div className="flex gap-6 items-end pointer-events-auto">

        {/* Video Call Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">

          {/* Local Video */}
          <div className="relative w-32 h-32 bg-gray-800 rounded-xl overflow-hidden border-2 border-red-600">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1 rounded">
              You
            </div>
          </div>

          {/* Remote Videos */}
          {Object.entries(remoteStreams).map(([id, stream]) => (
            <div
              key={id}
              className="relative w-32 h-32 bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-600"
            >
              <video
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                ref={(element) => {
                  if (element) {
                    element.srcObject = stream;
                  }
                }}
              />

              <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1 rounded">
                User {id.slice(0, 4)}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Panel */}
        <div className="w-80 h-[500px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-zinc-800 overflow-hidden">

          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">

            <h3 className="font-bold text-sm">
              Party Chat
            </h3>

            <div className="flex gap-2">

              <button
                onClick={toggleMute}
                className={`p-2 rounded-full ${
                  isMuted
                    ? "bg-red-500 text-white"
                    : "bg-gray-200 dark:bg-zinc-700"
                }`}
              >
                {isMuted ? (
                  <MicOff size={14} />
                ) : (
                  <Mic size={14} />
                )}
              </button>

              <button
                onClick={toggleCamera}
                className={`p-2 rounded-full ${
                  isVideoOff
                    ? "bg-red-500 text-white"
                    : "bg-gray-200 dark:bg-zinc-700"
                }`}
              >
                {isVideoOff ? (
                  <VideoOff size={14} />
                ) : (
                  <Video size={14} />
                )}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-2 rounded-full ${
                  isScreenSharing
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-zinc-700"
                }`}
                title="Share Screen"
              >
                <Monitor size={14} />
              </button>

            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className="flex gap-3 items-start"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-[10px]">
                    {msg.user?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">

                  <div className="flex items-baseline gap-2">

                    <span className="text-xs font-bold">
                      {msg.user}
                    </span>

                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                  </div>

                  <p className="text-sm text-gray-700 dark:text-zinc-300 leading-tight">
                    {msg.text}
                  </p>

                </div>
              </div>
            ))}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-3 border-t border-gray-200 dark:border-zinc-800 flex gap-2">

            <Input
              placeholder="Say something..."
              value={inputMessage}
              onChange={(e) =>
                setInputMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
              className="h-9 text-sm"
            />

            <Button
              size="sm"
              onClick={handleSend}
              className="h-9 px-3"
            >
              <Send size={14} />
            </Button>

          </div>
        </div>

        {/* Participants */}
        <div className="flex flex-col gap-2 mb-4">

          {participants.map((p, i) => (
            <Avatar
              key={i}
              className="w-10 h-10 border-2 border-white shadow-lg ring-2 ring-red-600"
            >
              <AvatarImage src="" />

              <AvatarFallback className="text-xs">
                U{i + 1}
              </AvatarFallback>
            </Avatar>
          ))}

          <Button
            variant="destructive"
            size="sm"
            onClick={leaveRoom}
            className="rounded-full w-10 h-10 p-0"
          >
            <PhoneOff size={16} />
          </Button>

        </div>

      </div>
    </div>
  );
}