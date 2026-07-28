import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

const Videogrid = () => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");

        console.log("API Response:", res.data);

        // If backend returns array
        if (Array.isArray(res.data)) {
          setvideo(res.data);
        }

        // If backend returns { videos: [...] }
        else if (Array.isArray(res.data.videos)) {
          setvideo(res.data.videos);
        }

        // Otherwise
        else {
          setvideo([]);
        }
      } catch (error) {
        console.log(error);
        setvideo([]);
      } finally {
        setloading(false);
      }
    };

    fetchvideo();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.length > 0 ? (
        videos.map((video: any) => (
          <Videocard key={video._id} video={video} />
        ))
      ) : (
        <h2 className="text-center col-span-full">
          No Videos Found
        </h2>
      )}
    </div>
  );
};

export default Videogrid;