import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/router";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

type Participant = { socketId: string; userId: string; userName: string };
type ChatMessage = { id: string; user: string; message: string };
type JoinResponse = { ok: boolean; isHost?: boolean; error?: string };
type Playback = { action: "play" | "pause" | "seek"; timestamp: number; updatedAt?: number };
type SignalPayload = { from: string; offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function WatchPartyRoom() {
  const router = useRouter();
  const roomId = typeof router.query.roomId === "string" ? router.query.roomId : "";
  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const suppressSync = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [connected, setConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [callError, setCallError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [userName] = useState(() => `Guest-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);

  const getVideoUrl = (url: string) => (url.startsWith("http") ? url : `${SOCKET_URL}${url}`);

  const negotiate = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const socket = socketRef.current;
    if (!socket || !roomId || pc.signalingState !== "stable") return;
    try {
      const offer = await pc.createOffer();
      if (pc.signalingState !== "stable") return;
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { roomId, to: peerId, offer: pc.localDescription });
    } catch (err) {
      console.error("WebRTC offer failed", err);
    }
  }, [roomId]);

  const ensurePeer = useCallback((peerId: string) => {
    const existing = peersRef.current.get(peerId);
    if (existing) return existing;
    const pc = new RTCPeerConnection(rtcConfig);
    peersRef.current.set(peerId, pc);

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } else {
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.addTransceiver("video", { direction: "recvonly" });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("webrtc-ice-candidate", {
          roomId,
          to: peerId,
          candidate: event.candidate,
        });
      }
    };
    pc.ontrack = (event) => {
      const incoming = event.streams[0];
      if (incoming) setRemoteStreams((old) => ({ ...old, [peerId]: incoming }));
    };
pc.onconnectionstatechange = () => {
  console.log("Peer:", peerId, "Connection:", pc.connectionState);
  console.log("ICE:", pc.iceConnectionState);
};

pc.oniceconnectionstatechange = () => {
  console.log("ICE state:", pc.iceConnectionState);
};

pc.ontrack = (event) => {
  console.log("REMOTE TRACK:", event.track.kind);
  const stream = event.streams[0];
  if (stream) {
    setRemoteStreams((old) => ({ ...old, [peerId]: stream }));
  }
};
    return pc;
  }, [roomId]);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    if (!localStream) return;

    // Add local camera/microphone tracks to existing peer connections.
    peersRef.current.forEach((pc, peerId) => {
      const existingTrackIds = new Set(
        pc.getSenders().map((sender) => sender.track?.id).filter(Boolean)
      );
      localStream.getTracks().forEach((track) => {
        if (!existingTrackIds.has(track.id)) pc.addTrack(track, localStream);
      });
      void negotiate(peerId, pc);
    });
  }, [localStream, negotiate]);

  useEffect(() => {
    if (!router.isReady || !roomId) return;
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError("");
      socket.emit("join-room", { roomId, userName }, (response: JoinResponse) => {
        if (!response?.ok) setError(response?.error || "Could not join this room.");
        else setIsHost(Boolean(response.isHost));
      });
    });
    socket.on("connect_error", () => {
      setConnected(false);
      setError(`Backend connection failed: ${SOCKET_URL}`);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("room-state", (data: { videoUrl?: string }) => {
      if (data.videoUrl) setVideoUrl(getVideoUrl(data.videoUrl));
    });
    socket.on("room-participants", (users: Participant[]) => setParticipants(users));
    socket.on("video-changed", (data: { videoUrl: string }) => setVideoUrl(getVideoUrl(data.videoUrl)));
    socket.on("video-sync", (playback: Playback) => {
      const video = videoRef.current;
      if (!video) return;
      suppressSync.current = true;
      if (Number.isFinite(playback.timestamp)) video.currentTime = playback.timestamp;
      if (playback.action === "play") void video.play().catch(() => {});
      else if (playback.action === "pause") video.pause();
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => { suppressSync.current = false; }, 500);
    });
    socket.on("receive-message", (data: { id?: string; user?: string; message?: string }) => {
      setMessages((old) => [...old, {
        id: data.id || `${Date.now()}-${Math.random()}`,
        user: data.user || "Guest",
        message: data.message || "",
      }]);
    });

    socket.on("user-disconnected", (peerId: string) => {
      const pc = peersRef.current.get(peerId);
      pc?.close();
      peersRef.current.delete(peerId);
      setRemoteStreams((old) => {
        const next = { ...old };
        delete next[peerId];
        return next;
      });
    });

    socket.on("webrtc-offer", async ({ from, offer }: SignalPayload) => {
      if (!from || !offer) return;
      const pc = ensurePeer(from);
      try {
        if (pc.signalingState !== "stable") await pc.setLocalDescription({ type: "rollback" });
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const queued = pendingCandidates.current.get(from) || [];
for (const candidate of queued) {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}
pendingCandidates.current.delete(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { roomId, to: from, answer: pc.localDescription });
      } catch (err) {
        console.error("WebRTC offer handling failed", err);
      }
    });
    socket.on("webrtc-answer", async ({ from, answer }: SignalPayload) => {
      if (!from || !answer) return;
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); }
      catch (err) { console.error("WebRTC answer handling failed", err); }
    });
    socket.on("webrtc-ice-candidate", async ({ from, candidate }: SignalPayload) => {
  if (!from || !candidate) return;

  const pc = ensurePeer(from);

  try {
    if (pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      const queued = pendingCandidates.current.get(from) || [];
      queued.push(candidate);
      pendingCandidates.current.set(from, queued);
    }
  } catch (err) {
    console.error("ICE candidate failed:", err);
  }
});

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      socket.emit("leave-room", { roomId });
      socket.disconnect();
      socketRef.current = null;
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
    };
  }, [router.isReady, roomId, userName, ensurePeer]);

  useEffect(() => {
    const ownId = socketRef.current?.id;
    if (!connected || !ownId) return;
    participants.forEach((person) => {
      if (person.socketId === ownId) return;
      const pc = ensurePeer(person.socketId);
      // The lexically smaller socket starts the initial offer to avoid duplicate offers.
      if (ownId.localeCompare(person.socketId) < 0 && pc.signalingState === "stable" && !pc.remoteDescription) {
        void negotiate(person.socketId, pc);
      }
    });
  }, [participants, connected, ensurePeer, negotiate]);

  const sendAction = useCallback((action: "play" | "pause" | "seek") => {
    if (suppressSync.current) return;
    socketRef.current?.emit("video-action", { roomId, action, timestamp: videoRef.current?.currentTime ?? 0 });
  }, [roomId]);

  const startCall = async () => {
    try {
      setCallError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
      console.log("MY SOCKET:", socketRef.current?.id);
console.log("PARTICIPANTS:", participants);
console.log("PEERS:", [...peersRef.current.keys()]);
      localStreamRef.current = stream;
      setCameraOn(true);
      setMicOn(true);
      // Create/offer to peers after stream is ready.
      participants.forEach((person) => {
        const ownId = socketRef.current?.id;
        if (!ownId || person.socketId === ownId) return;
        const pc = ensurePeer(person.socketId);
        const currentIds = new Set(pc.getSenders().map((sender) => sender.track?.id).filter(Boolean));
        stream.getTracks().forEach((track) => { if (!currentIds.has(track.id)) pc.addTrack(track, stream); });
        void negotiate(person.socketId, pc);
      });
    } catch {
      setCallError("Camera/microphone permission denied or unavailable. Check browser permissions.");
    }
  };

  const toggleCamera = () => {
    if (!localStream) { void startCall(); return; }
    const next = !cameraOn;
    localStream.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraOn(next);
  };

  const toggleMic = () => {
    if (!localStream) { void startCall(); return; }
    const next = !micOn;
    localStream.getAudioTracks().forEach((track) => { track.enabled = next; });
    setMicOn(next);
  };

  const leaveParty = () => {
    socketRef.current?.emit("leave-room", { roomId });
    socketRef.current?.disconnect();
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
    void router.push("/watch-party");
  };

  const uploadVideo = async (file: File) => {
    if (!isHost) { setError("Only the room host can upload a video."); return; }
    setUploading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("video", file);
      const response = await fetch(`${SOCKET_URL}/watch-party/upload`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Video upload failed.");
      if (!data.videoUrl) throw new Error("Backend did not return a video URL.");
      socketRef.current?.emit("change-video", { roomId, videoUrl: data.videoUrl }, (result: { ok: boolean; error?: string }) => {
        if (!result?.ok) setError(result?.error || "Could not share this video.");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadVideo(file);
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || !socketRef.current || !connected) return;
    socketRef.current.emit("send-message", { roomId, message });
    setChatInput("");
  };

  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setError(""); alert("Room invite link copied!"); }
    catch { setError("Copy failed. Copy the link from the address bar."); }
  };

  return (
    <main className="min-h-screen bg-[#080b12] p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button type="button" onClick={() => router.push("/watch-party")} className="mb-3 text-sm text-gray-400 hover:text-white">← Back to Watch Party</button>
            <h1 className="text-2xl font-bold md:text-3xl">🍿 Watch Party</h1>
            <p className="mt-2 text-sm text-gray-400">Room: <span className="font-bold text-violet-300">{roomId}</span> · <span className={connected ? "text-green-400" : "text-red-400"}>{connected ? "Connected" : "Connecting..."}</span>{isHost && " · Host"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyInvite} className="rounded-xl bg-violet-600 px-4 py-3 font-semibold hover:bg-violet-500">Copy invite link</button>
            <button type="button" onClick={leaveParty} className="rounded-xl bg-red-600 px-4 py-3 font-semibold hover:bg-red-500">Leave party</button>
          </div>
        </header>

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        {callError && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{callError}</div>}

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              {videoUrl ? <video ref={videoRef} src={videoUrl} controls playsInline className="aspect-video w-full" onPlay={() => sendAction("play")} onPause={() => sendAction("pause")} onSeeked={() => sendAction("seek")}>Your browser does not support video playback.</video> : <div className="flex aspect-video flex-col items-center justify-center p-6 text-center"><div className="text-5xl">🎬</div><h2 className="mt-4 text-xl font-semibold">No video selected</h2><p className="mt-2 max-w-sm text-sm text-gray-400">{isHost ? "Upload a video to start watching together." : "Waiting for the host to upload a video."}</p></div>}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#111622] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">🎥 Video call</h2><p className="mt-1 text-sm text-gray-400">Allow camera and microphone access to join the call.</p></div>
                {!localStream ? <button type="button" onClick={() => void startCall()} className="rounded-xl bg-violet-600 px-4 py-2.5 font-semibold hover:bg-violet-500">Join video call</button> : <div className="flex flex-wrap gap-2"><button type="button" onClick={toggleCamera} className={`rounded-xl px-4 py-2.5 font-semibold ${cameraOn ? "bg-white/10 hover:bg-white/20" : "bg-amber-600 hover:bg-amber-500"}`}>{cameraOn ? "📷 Camera on" : "🚫 Camera off"}</button><button type="button" onClick={toggleMic} className={`rounded-xl px-4 py-2.5 font-semibold ${micOn ? "bg-white/10 hover:bg-white/20" : "bg-amber-600 hover:bg-amber-500"}`}>{micOn ? "🎙️ Mic on" : "🔇 Mic muted"}</button><button type="button" onClick={() => { localStream.getTracks().forEach((track) => track.stop()); localStreamRef.current = null; setLocalStream(null); setCameraOn(false); setMicOn(false); peersRef.current.forEach((pc) => pc.close()); peersRef.current.clear(); setRemoteStreams({}); }} className="rounded-xl bg-red-600 px-4 py-2.5 font-semibold hover:bg-red-500">End call</button></div>}
              </div>
              {localStream && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="relative overflow-hidden rounded-xl bg-black"><video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" /> <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">You</span></div>{participants.filter((person) => person.socketId !== socketRef.current?.id).map((person) => <div key={person.socketId} className="relative overflow-hidden rounded-xl bg-black"><RemoteVideo stream={remoteStreams[person.socketId]} /><span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs">{person.userName}</span></div>)}</div>}
            </div>

            {isHost && <div className="mt-4 rounded-2xl border border-white/10 bg-[#111622] p-4"><h2 className="font-semibold">Choose a video</h2><p className="mt-1 text-sm text-gray-400">MP4 and WebM are recommended.</p><input ref={fileRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,.m4v" disabled={uploading} onChange={handleFileChange} className="mt-4 block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-semibold file:text-white" />{uploading && <p className="mt-3 text-sm text-violet-300">Uploading video...</p>}</div>}

            <div className="mt-5 rounded-2xl border border-white/10 bg-[#111622] p-4"><h2 className="font-semibold">People in this room</h2><p className="mt-1 text-sm text-gray-400">{participants.length} participant(s)</p><div className="mt-3 flex flex-wrap gap-2">{participants.map((person) => <span key={person.socketId} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm">👤 {person.userName}{person.socketId === socketRef.current?.id && " (You)"}</span>)}</div></div>
          </section>

          <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111622]"><div className="border-b border-white/10 p-4"><h2 className="font-semibold">💬 Party chat</h2><p className="mt-1 text-xs text-gray-400">Chat with everyone watching.</p></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No messages yet. Say hello!</p>}{messages.map((item) => <div key={item.id} className="break-words"><p className="text-xs font-semibold text-violet-300">{item.user}</p><p className="mt-1 rounded-xl bg-white/5 px-3 py-2 text-sm">{item.message}</p></div>)}</div><form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3"><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Type a message..." maxLength={1000} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:border-violet-500" /><button type="submit" disabled={!connected || !chatInput.trim()} className="rounded-xl bg-violet-600 px-4 font-semibold disabled:opacity-50">Send</button></form></aside>
        </div>
      </div>
    </main>
  );
}

function RemoteVideo({ stream }: { stream?: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream || null; }, [stream]);
  return <video ref={ref} autoPlay playsInline className="aspect-video w-full object-cover" />;
}
