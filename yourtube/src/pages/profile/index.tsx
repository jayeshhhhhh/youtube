"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Calendar, Video, User, CreditCard } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DownloadRecord {
  _id: string;
  videoTitle: string;
  downloadDate: string;
  fileSize: string;
}

export default function ProfilePage() {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!user) return;
      try {
        const res = await axiosInstance.get(`/user/downloads/${user._id}`);
        setDownloads(res.data);
      } catch (error) {
        console.error("Error fetching downloads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDownloads();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Please login to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 space-y-8">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
          {user.name?.[0] || "U"}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-gray-500">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase">
              {user.plan || "Free"} Plan
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} /> Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Joined</span>
              <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Plan</span>
              <span className="font-medium">{user.plan || "Free"}</span>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => window.location.href = "/upgrade"}>
              <CreditCard className="w-4 h-4 mr-2" /> Upgrade Plan
            </Button>
          </CardContent>
        </Card>

        {/* Downloads History Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={20} /> My Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500">Loading downloads...</p>
            ) : downloads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No downloaded videos found.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {downloads.map((dl) => (
                    <div key={dl._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-zinc-700 rounded shadow-sm">
                          <Video size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{dl.videoTitle}</p>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(dl.downloadDate).toLocaleDateString()} • {dl.fileSize}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">View</Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
