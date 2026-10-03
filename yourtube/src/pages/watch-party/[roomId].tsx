"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VideoPlayer from "@/components/Videopplayer";
import WatchPartyOverlay from "@/components/WatchPartyOverlay";
import { useWatchParty } from "@/context/WatchPartyContext";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function WatchPartyPage() {
  const { roomId } = useRouter().query as any; // simplified for example
  const { joinRoom, leaveRoom, roomId: activeRoomId } = useWatchParty();
  const { user } = useUser();
  const [joinCode, setJoinCode] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId);
      setIsJoined(true);
    }
  }, [roomId]);

  const handleJoin = async () => {
    if (!joinCode) return;
    joinRoom(joinCode);
    setIsJoined(true);
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4 text-center">
            <h1 className="text-2xl font-bold">Join a Watch Party</h1>
            <p className="text-sm text-gray-500">Enter the room code shared by your friend</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter 6-digit code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <Button onClick={handleJoin}>Join</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative w-full h-screen overflow-hidden">
        <VideoPlayer video={{ _id: "1", videotitle: "Party Video", filepath: "sample.mp4" }} />
        <WatchPartyOverlay user={user} />

        <div className="absolute top-4 left-4 z-10">
          <Button variant="outline" onClick={leaveRoom} className="bg-white/10 text-white border-white/20 backdrop-blur-md">
            Leave Party
          </Button>
        </div>
      </div>
    </div>
  );
}
