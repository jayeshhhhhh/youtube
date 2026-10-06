import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import Download from "../Modals/download.js";
import { sendOTP } from "../utils/email.js";
import axios from "axios";

export const login = async (req, res) => {
  const { email, name, image } = req.body;
  console.log("Login attempt for email:", email);

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      console.log("User not found, creating new user...");
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser });
    } else {
      console.log("User found, checking security...");
      const userAgent = req.headers["user-agent"];
      const ip = req.ip || req.connection.remoteAddress;

      let location = "Unknown";
      try {
        const geoRes = await axios.get(`http://ip-api.com/json/${ip}`);
        location = `${geoRes.data.city}, ${geoRes.data.regionName}`;
      } catch (e) {
        console.error("Geo-location error:", e.message);
      }

      const isNewDevice = existingUser.lastLoginDevice !== userAgent;
      const isNewLocation = existingUser.lastLoginLocation !== location;

      if (isNewDevice || isNewLocation) {
        console.log("Security check failed: New device/location. Triggering OTP.");
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await users.findByIdAndUpdate(existingUser._id, {
          otpCode: otp,
          otpExpiresAt: expiresAt,
        });

        try {
          await sendOTP(existingUser.email, otp);
          console.log(`OTP sent to ${existingUser.email}: ${otp}`);
        } catch (emailErr) {
          console.error("Email sending failed:", emailErr.message);
          // We no longer "allow login for dev" here to ensure the OTP flow is strictly tested
        }

        return res.status(202).json({
          requiresOtp: true,
          userId: existingUser._id,
          message: "New device or location detected. Please verify via email.",
          devOtp: otp
        });
      }

      console.log("Security check passed. Logging in...");
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("CRITICAL Login error:", error);
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message
    });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await users.findById(userId);
    if (!user || !user.otpCode || String(user.otpCode) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const userAgent = req.headers["user-agent"];
    const ip = req.ip || req.connection.remoteAddress;
    let location = "Unknown";
    try {
      const geoRes = await axios.get(`http://ip-api.com/json/${ip}`);
      location = `${geoRes.data.city}, ${geoRes.data.regionName}`;
    } catch (e) {
      console.error("Geo-location error:", e.message);
    }

    const updatedUser = await users.findByIdAndUpdate(userId, {
      otpCode: null,
      otpExpiresAt: null,
      lastLoginIp: ip,
      lastLoginDevice: userAgent,
      lastLoginLocation: location,
    }, { new: true });

    return res.status(200).json({ result: updatedUser });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description, preferredTheme } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
          preferredTheme: preferredTheme,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getUserDownloads = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(401).json({ message: "User ID is required" });
  }

  try {
    const downloads = await Download.find({ userId: userId })
      .populate("videoId")
      .sort({ downloadDate: -1 });
    return res.status(200).json(downloads);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
