"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  Calendar,
  Video,
  User,
  CreditCard,
  Clock,
  FileVideo,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DownloadRecord {
  _id: string;
  videoTitle: string;
  thumbnail?: string;
  downloadDate: string;
  fileSize?: string;
  planAtDownload?: string;
  downloadCount?: number;
  filename?: string;
}

interface DownloadResponse {
  downloads: DownloadRecord[];
  plan: string;
  dailyLimit: number;
  todayDownloads: number;
  remainingDownloads: number;
}

const planLimits: Record<string, number> = {
  free: 1,
  bronze: 5,
  silver: 10,
  gold: 20,
};

export default function ProfilePage() {
  const {
    user,
    changeTheme,
    otpPending,
    verifyOtp,
    isVerifying,
  } = useUser();

  const { preference: selectedTheme } = useTheme();

  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");
  const [dailyLimit, setDailyLimit] = useState(1);
  const [todayDownloads, setTodayDownloads] = useState(0);
  const [remainingDownloads, setRemainingDownloads] = useState(1);

  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  useEffect(() => {
    const fetchDownloads = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        const res = await axiosInstance.get<DownloadResponse>(
          `/download/${user._id}`
        );

        setDownloads(res.data.downloads || []);
        setPlan(res.data.plan || "free");

        setDailyLimit(
          res.data.dailyLimit ||
            planLimits[res.data.plan] ||
            1
        );
        

        setTodayDownloads(res.data.todayDownloads || 0);
        setRemainingDownloads(res.data.remainingDownloads || 0);
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
        <p className="text-gray-500">
          Please login to view your profile.
        </p>
      </div>
    );
  }

  const usedPercentage =
    dailyLimit > 0
      ? Math.min((todayDownloads / dailyLimit) * 100, 100)
      : 0;

  const planName =
    plan.charAt(0).toUpperCase() + plan.slice(1);

  const handleThemeChange = async (
    newTheme: "light" | "dark" | "auto"
  ) => {
    const result = await changeTheme(newTheme);

    if (!result.success) {
      alert(result.message);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpMessage("Please enter the 6-digit OTP.");
      return;
    }

    setOtpMessage("");

    const result = await verifyOtp(otp);

    if (!result.success) {
      setOtpMessage(result.message || "Invalid OTP");
      return;
    }

    setOtp("");
    setOtpMessage("");
  };

  return (
    <div className="container mx-auto py-12 px-4 space-y-8">
      {otpPending && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <ShieldCheck className="text-blue-600" size={30} />
              </div>

              <CardTitle className="text-2xl">Verify Your Login</CardTitle>

              <p className="text-sm text-gray-500 mt-2">
                A new device or location was detected.
              </p>

              <p className="text-sm text-gray-500">
                We sent a 6-digit OTP to your registered email.
              </p>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-zinc-800">
                <Mail size={20} className="text-blue-600" />
                <span className="text-sm break-all">{user.email}</span>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit OTP"
                className="w-full h-12 rounded-lg border px-s-4 text-center text-xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-blue-500 bg-background"
              />

              {otpMessage && (
                <p className="text-sm text-red-500 text-center">
                  {otpMessage}
                </p>
              )}

              <Button
                className="w-full h-11"
                onClick={handleVerifyOtp}
                disabled={isVerifying || otp.length !== 6}
              >
                {isVerifying ? "Verifying..." : "Verify & Continue"}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                OTP expires in 10 minutes.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
          {user.name?.[0]?.toUpperCase() || "U"}
        </div>

        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-gray-500">{user.email}</p>
          <div className="mt-2">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase">
              {planName} Plan
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              Account Details
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Joined</span>
              <span>
                {user.joinedon
                  ? new Date(user.joinedon).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Current Plan</span>
              <span className="font-medium capitalize">{plan}</span>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Today's Downloads</span>
                <span className="text-sm font-bold">
                  {todayDownloads} / {dailyLimit}
                </span>
              </div>

              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${usedPercentage}%` }}
                />
              </div>

              <p className="text-xs text-gray-500 mt-2">
                {remainingDownloads > 0
                  ? `${remainingDownloads} download${
                      remainingDownloads > 1 ? "s" : ""
                    } remaining today`
                  : "Daily download limit reached"}
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => (window.location.href = "/upgrade")}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor size={20} />
              Theme Settings
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              Auto mode uses Light between 10 AM and
              12 PM IST and Dark at other times.
            </p>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedTheme === "light" ? "default" : "outline"}
                className="flex flex-col h-20 gap-1"
                onClick={() => handleThemeChange("light")}
              >
                <Sun size={20} />
                <span className="text-xs">Light</span>
              </Button>

              <Button
                variant={selectedTheme === "dark" ? "default" : "outline"}
                className="flex flex-col h-20 gap-1"
                onClick={() => handleThemeChange("dark")}
              >
                <Moon size={20} />
                <span className="text-xs">Dark</span>
              </Button>

              <Button
                variant={selectedTheme === "auto" ? "default" : "outline"}
                className="flex flex-col h-20 gap-1"
                onClick={() => handleThemeChange("auto")}
              >
                <Monitor size={20} />
                <span className="text-xs">Auto</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck size={20} />
              Security
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              YourTube asks for OTP verification when
              a new device or location is detected.
            </p>

            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Email verification enabled
              </p>
            </div>

            <p className="text-xs text-gray-500">
              Registered email:
            </p>

            <p className="text-sm font-medium break-all">{user.email}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Download size={20} />
              Download History
            </CardTitle>

            <span className="text-sm text-gray-500">
              {downloads.length} total
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-10">
              <p className="text-gray-500">
                Loading download history...
              </p>
            </div>
          ) : downloads.length === 0 ? (
            <div className="text-center py-10">
              <Download className="mx-auto mb-3 text-gray-400" size={40} />
              <p className="text-gray-500">No downloaded videos yet.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {downloads.map((dl) => (
                  <div
                    key={dl._id}
                    className="flex gap-4 p-4 rounded-xl border bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700"
                  >
                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-zinc-700 flex-shrink-0">
                      {dl.thumbnail ? (
                        <img
                          src={dl.thumbnail}
                          alt={dl.videoTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileVideo size={30} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {dl.videoTitle}
                      </h3>

                      <div className="flex flex-col gap-1 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {new Date(dl.downloadDate).toLocaleDateString()}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {new Date(dl.downloadDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        <span className="flex items-center gap-1">
                          <Video size={13} />
                          {dl.fileSize || "Size unavailable"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                        {dl.planAtDownload || "free"}
                      </span>

                      <span className="text-xs text-gray-500">
                        Download # {dl.downloadCount || 1}
                      </span>
                    </div>
                  </div>
                ))}
              </HScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
