"use client";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  return (
    <div className="w-full bg-black rounded-lg overflow-hidden">
      <video
        className="w-full block"
        controls
        playsInline
        preload="metadata"
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}