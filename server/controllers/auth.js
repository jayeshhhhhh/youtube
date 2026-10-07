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

const getLocationFromIp = async (ip) => {
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

    const geoRes = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 5000,
    });

    if (
      geoRes.data?.status === "success" &&
      geoRes.data?.city &&
      geoRes.data?.regionName
    ) {
      return `${geoRes.data.city}, ${geoRes.data.regionName}`;
    }

    return "Unknown";
  } catch (error) {
    console.error("Geo-location error:", error.message);
    return "Unknown";
  }
};

const getAutomaticTheme = () => {
  const currentTime = new Date();

  const istTime = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(currentTime);

  const hour = Number(
    istTime.find((part) => part.type === "hour")?.value || 0
  );

  const minute = Number(
    istTime.find((part) => part.type === "minute")?.value || 0
  );

  const totalMinutes = hour * 60 + minute;

  const startTime = 10 * 60;
  const endTime = 12 * 60;

  if (totalMinutes >= startTime && totalMinutes <= endTime) {
    return "light";
  }

  return "dark";
};

const updateAutomaticTheme = async (user) => {
  if (user.preferredTheme === "auto") {
    return getAutomaticTheme();
  }

  return user.preferredTheme;
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  console.log("Login attempt for email:", email);

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      console.log("User not found, creating new user...");

      const automaticTheme = getAutomaticTheme();

      const newUser = await users.create({
        email,
        name,
        image,
        preferredTheme: "auto",
        lastLoginIp: getClientIp(req),
        lastLoginDevice: req.headers["user-agent"] || "Unknown",
        lastLoginLocation: await getLocationFromIp(getClientIp(req)),
      });

      const selectedTheme = automaticTheme;

      return res.status(201).json({
        result: newUser,
        selectedTheme,
      });
    }

    console.log("User found, checking security...");

    const userAgent = req.headers["user-agent"] || "Unknown";
    const ip = getClientIp(req);
    const location = await getLocationFromIp(ip);

    const previousDevice = existingUser.lastLoginDevice || "";
    const previousLocation = existingUser.lastLoginLocation || "";

    const isNewDevice =
      previousDevice &&
      previousDevice !== "Unknown" &&
      previousDevice !== userAgent;

    const isNewLocation =
      previousLocation &&
      previousLocation !== "Unknown" &&
      location !== "Unknown" &&
      previousLocation !== location;

    const hasPreviousLogin =
      Boolean(existingUser.lastLoginDevice) ||
      Boolean(existingUser.lastLoginLocation);

    if (
      hasPreviousLogin &&
      (isNewDevice || isNewLocation)
    ) {
      console.log(
        "New device/location detected. Triggering OTP."
      );

      const otp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();

      const expiresAt = new Date(
        Date.now() + 10 * 60 * 1000
      );

      await users.findByIdAndUpdate(existingUser._id, {
        otpCode: otp,
        otpExpiresAt: expiresAt,
      });

      try {
        await sendOTP(existingUser.email, otp);
        console.log("OTP sent successfully");
      } catch (emailError) {
        console.error(
          "OTP email sending failed:",
          emailError.message
        );

        return res.status(500).json({
          message:
            "Unable to send verification OTP. Please try again.",
        });
      }

      return res.status(202).json({
        requiresOtp: true,
        userId: existingUser._id,
        message:
          "New device or location detected. Please verify via email.",
      });
    }

    const selectedTheme =
      await updateAutomaticTheme(existingUser);

    await users.findByIdAndUpdate(existingUser._id, {
      lastLoginIp: ip,
      lastLoginDevice: userAgent,
      lastLoginLocation: location,
    });

    const updatedUser = await users.findById(existingUser._id);

    console.log("Security check passed. Logging in...");

    return res.status(200).json({
      result: updatedUser,
      selectedTheme,
    });
  } catch (error) {
    console.error("CRITICAL Login error:", error);

    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await users.findById(userId);

    if (!user || !user.otpCode) {
      return res.status(400).json({
        message: "Invalid OTP code",
      });
    }

    if (String(user.otpCode) !== String(otp)) {
      return res.status(400).json({
        message: "Invalid OTP code",
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

    const userAgent =
      req.headers["user-agent"] || "Unknown";

    const ip = getClientIp(req);
    const location = await getLocationFromIp(ip);

    const selectedTheme =
      await updateAutomaticTheme(user);

    const updatedUser = await users.findByIdAndUpdate(
      userId,
      {
        otpCode: null,
        otpExpiresAt: null,
        lastLoginIp: ip,
        lastLoginDevice: userAgent,
        lastLoginLocation: location,
      },
      {
        new: true,
      }
    );

    return res.status(200).json({
      result: updatedUser,
      selectedTheme,
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);

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
    return res.status(500).json({
      message: "User unavailable...",
    });
  }

  try {
    const updateData = {
      channelname,
      description,
    };

    if (
      preferredTheme === "light" ||
      preferredTheme === "dark" ||
      preferredTheme === "auto"
    ) {
      updateData.preferredTheme = preferredTheme;
    }

    const updatedUser =
      await users.findByIdAndUpdate(
        _id,
        {
          $set: updateData,
        },
        {
          new: true,
        }
      );

    return res.status(201).json(updatedUser);
  } catch (error) {
    console.error(error);

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
      userId: userId,
    })
      .populate("videoId")
      .sort({ downloadDate: -1 });

    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Download history error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};