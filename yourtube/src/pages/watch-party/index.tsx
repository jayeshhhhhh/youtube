
import { useState, type FormEvent } from "react";
import { useRouter } from "next/router";

export default function WatchPartyHome() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const createRoom = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    router.push(`/watch-party/${code}`);
  };

  const joinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = roomCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter a room code.");
      return;
    }

    setError("");
    router.push(`/watch-party/${encodeURIComponent(code)}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b12] p-5 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111622] p-8 shadow-2xl">
        <div className="text-5xl">🍿</div>

        <h1 className="mt-5 text-3xl font-bold">
          Watch movies together
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          Create a private room, watch videos together, and chat with friends
          in real time.
        </p>

        <button
          type="button"
          onClick={createRoom}
          className="mt-7 w-full rounded-xl bg-violet-600 px-4 py-3.5 font-semibold hover:bg-violet-500"
        >
          ＋ Create a new room
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-white/10" />
          JOIN WITH CODE
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={joinRoom} className="space-y-3">
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
            placeholder="Enter your friend's room code"
            maxLength={100}
            required
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none focus:border-violet-500"
          />

          <button
            type="submit"
            className="w-full rounded-xl border border-white/10 px-4 py-3.5 font-semibold hover:bg-white/5"
          >
            Join watch party
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}