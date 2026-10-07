import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import Download from "../Modals/download.js";
import { sendOTP } from "../utils/email.js";
import axios from "axios";

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    ""
  );
};

const getCityState = async (ip) => {
  try {
    if (
      !ip ||
      ip === "::1" ||
      ip === "127.0.0.1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.")
    ) {
      return "Unknown";
    }

    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,city,regionName`,
      { timeout: 5000 }
    );

    if (
      response.data?.status === "success" &&
      response.data?.city &&
      response.data?.regionName
    ) {
      return `${response.data.city}, ${response.data.regionName}`;
    }

    return "Unknown";
  } catch (error) {
    console.error("Location error:", error.message);
    return "Unknown";
  }
};

const getAutomaticTheme = () => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value || 0
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  const totalMinutes = hour * 60 + minute;

  return totalMinutes >= 600 && totalMinutes < 720
    ? "light"
    : "dark";
};

const getSelectedTheme = (user) => {
  if (user?.preferredTheme === "light") {
    return "light";
  }

  if (user?.preferredTheme === "dark") {
    return "dark";
  }

  return getAutomaticTheme();
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  console.log("Login attempt:", email);

  try {
    let existingUser = await users.findOne({ email });

    const ip = getClientIp(req);
    const userAgent =
      req.headers["user-agent"] || "Unknown";

    const currentLocation = await getCityState(ip);

    if (!existingUser) {
      const automaticTheme = getAutomaticTheme();

      const newUser = await users.create({
        email,
        name,
        image,
        preferredTheme: "auto",
        lastLoginIp: ip,
        lastLoginDevice: userAgent,
        lastLoginLocation: currentLocation,
      });

      return res.status(201).json({
        result: newUser,
        selectedTheme: automaticTheme,
      });
    }

    const previousDevice =
      existingUser.lastLoginDevice || "";

    const previousLocation =
      existingUser.lastLoginLocation || "";

    const isNewDevice =
      previousDevice &&
      previousDevice !== "Unknown" &&
      previousDevice !== userAgent;

    const isNewLocation =
      previousLocation &&
      previousLocation !== "Unknown" &&
      currentLocation !== "Unknown" &&
      previousLocation !== currentLocation;

    const hasPreviousLogin =
      Boolean(previousDevice) ||
      Boolean(previousLocation);

    if (
      hasPreviousLogin &&
      (isNewDevice || isNewLocation)
    ) {
      console.log(
        "New device/location detected. OTP required."
      );

      const otp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      const otpExpiresAt = new Date(
        Date.now() + 10 * 60 * 1000
      );

      await users.findByIdAndUpdate(
        existingUser._id,
        {
          otpCode: otp,
          otpExpiresAt,
        }
      );

      try {
        await sendOTP(
          existingUser.email,
          otp
        );
      } catch (error) {
        console.error(
          "OTP email error:",
          error.message
        );

        return res.status(500).json({
          message:
            "Unable to send OTP. Please try again.",
        });
      }

      return res.status(202).json({
        requiresOtp: true,
        userId: existingUser._id,
        message:
          "New device or location detected. OTP verification required.",
      });
    }

    const selectedTheme =
      getSelectedTheme(existingUser);

    const updatedUser =
      await users.findByIdAndUpdate(
        existingUser._id,
        {
          lastLoginIp: ip,
          lastLoginDevice: userAgent,
          lastLoginLocation: currentLocation,
        },
        { new: true }
      );

    return res.status(200).json({
      result: updatedUser,
      selectedTheme,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({
      message: "User ID and OTP are required",
    });
  }

  try {
    const user = await users.findById(userId);

    if (!user || !user.otpCode) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (String(user.otpCode) !== String(otp).trim()) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (
      !user.otpExpiresAt ||
      new Date() > new Date(user.otpExpiresAt)
    ) {
      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    const ip = getClientIp(req);

    const userAgent =
      req.headers["user-agent"] || "Unknown";

    const currentLocation =
      await getCityState(ip);

    const selectedTheme =
      getSelectedTheme(user);

    const updatedUser =
      await users.findByIdAndUpdate(
        userId,
        {
          otpCode: null,
          otpExpiresAt: null,
          lastLoginIp: ip,
          lastLoginDevice: userAgent,
          lastLoginLocation: currentLocation,
        },
        { new: true }
      );

    return res.status(200).json({
      result: updatedUser,
      selectedTheme,
    });
  } catch (error) {
    console.error(
      "OTP verification error:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;

  const {
    channelname,
    description,
    preferredTheme,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({
      message: "User unavailable...",
    });
  }

  try {
    const updateData = {};

    if (channelname !== undefined) {
      updateData.channelname = channelname;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (
      preferredTheme === "light" ||
      preferredTheme === "dark" ||
      preferredTheme === "auto"
    ) {
      updateData.preferredTheme =
        preferredTheme;
    }

    const updatedUser =
      await users.findByIdAndUpdate(
        _id,
        { $set: updateData },
        { new: true }
      );

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(
      "Profile update error:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getUserDownloads = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(401).json({
      message: "User ID is required",
    });
  }

  try {
    const downloads = await Download.find({
      userId,
    })
      .populate("videoId")
      .sort({ downloadDate: -1 });

    return res.status(200).json(downloads);
  } catch (error) {
    console.error(
      "Download history error:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};