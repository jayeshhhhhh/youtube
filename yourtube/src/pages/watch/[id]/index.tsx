
import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;

  const [videos, setvideo] = useState<any>(null);
  const [video, setvide] = useState<any>(null);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;

      try {
        const res = await axiosInstance.get("/video/getall");

        const video = res.data?.filter(
          (vid: any) => vid._id === id
        );

        setvideo(video[0]);
        setvide(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };

    fetchvideo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black dark:bg-[#181818] dark:text-white flex items-center justify-center">
        Loading..
      </div>
    );
  }

  if (!videos) {
    return (
      <div className="min-h-screen bg-white text-black dark:bg-[#181818] dark:text-white flex items-center justify-center">
        Video not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-[#181818] dark:text-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-4">
              
              <Videopplayer
                video={videos}
                allVideos={video}
              />

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const roomCode = Math.random()
                      .toString(36)
                      .substring(2, 8)
                      .toUpperCase();

                    router.push(
                      `/watch-party/${roomCode}?video=${id}`
                    );
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Play
                    size={14}
                    fill="currentColor"
                  />
                  Start Watch Party
                </Button>
              </div>

            </div>

            <VideoInfo video={videos} />

            <Comments videoId={id} />
          </div>

          <div className="space-y-4">
            <RelatedVideos videos={video} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default index;

