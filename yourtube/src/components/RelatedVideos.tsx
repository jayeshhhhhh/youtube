
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface RelatedVideo {
  _id: string;
  videotitle: string;
  videochanel: string;
  filepath: string;
  thumbnail?: string;
  views: number;
  createdAt: string;
}

interface RelatedVideosProps {
  videos: RelatedVideo[];
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  if (!Array.isArray(videos)) return null;

  return (
    <div className="space-y-3">
      {videos.map((video) => {
        const thumbnailUrl = video.thumbnail
          ? video.thumbnail.startsWith("http")
            ? video.thumbnail
            : `${BACKEND_URL}/${video.thumbnail.replace(/^\/+/, "")}`
          : `${BACKEND_URL}/video/stream/${video._id}`;

        return (
          <Link
            key={video._id}
            href={`/watch/${video._id}`}
            className="flex gap-3 group"
          >
            <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {video.thumbnail ? (
                <img
                  src={thumbnailUrl}
                  alt={video.videotitle}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <video
                  src={thumbnailUrl}
                  preload="metadata"
                  muted
                  className="object-cover w-full h-full"
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
                {video.videotitle}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {video.videochanel}
              </p>
              <p className="text-xs text-gray-600">
                {(video.views || 0).toLocaleString()} views
                {" • "}
                {video.createdAt
                  ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
                  : ""}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
