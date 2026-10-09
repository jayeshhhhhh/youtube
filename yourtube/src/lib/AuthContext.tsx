
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useTheme } from "../context/ThemeContext";

interface User {
  _id: string;
  name: string;
  email?: string;
  image?: string;
  preferredTheme?: string;
  [key: string]: any;
}

interface UserContextType {
  user: User | null;
  logout: () => Promise<void>;
  handlegooglesignin: () => Promise<any>;
  login: (userdata: User, selectedTheme?: string) => void;
  refreshUser: () => Promise<any>;
  otpPending: boolean;
  pendingUserId: string | null;
  isVerifying: boolean;
  verifyOtp: (otp: string) => Promise<any>;
  changeTheme: (selectedTheme: string) => Promise<any>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  logout: async () => {},
  handlegooglesignin: async () => ({ success: false }),
  login: () => {},
  refreshUser: async () => null,
  otpPending: false,
  pendingUserId: null,
  isVerifying: false,
  verifyOtp: async () => ({ success: false }),
  changeTheme: async () => ({ success: false }),
});

export const UserProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { setThemePreference } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [otpPending, setOtpPending] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const login = (userdata: User, selectedTheme?: string) => {
    setUser(userdata);
const preferredTheme = (
  selectedTheme || userdata?.preferredTheme || "auto"
) as "light" | "dark" | "auto";

setThemePreference(preferredTheme);

    localStorage.setItem("user", JSON.stringify(userdata));
    localStorage.removeItem("otpPending");
    localStorage.removeItem("pendingUserId");

    setOtpPending(false);
    setPendingUserId(null);
  };

  const refreshUser = async () => {
    if (!user?._id) return null;

    try {
      const response = await axiosInstance.get(`/user/${user._id}`);
      const updatedUser = response.data;

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setThemePreference(updatedUser?.preferredTheme || "auto");

      return updatedUser;
    } catch (error) {
      console.error("User refresh error:", error);
      return null;
    }
  };

  const changeTheme = async (selectedTheme: string) => {
    setThemePreference(selectedTheme);

    if (!user?._id) return { success: true };

    try {
      const response = await axiosInstance.patch(
        `/user/update/${user._id}`,
        { preferredTheme: selectedTheme }
      );

      const updatedUser = response.data;

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      return { success: true };
    } catch (error: any) {
      console.error("Theme update error:", error);

      setThemePreference(user?.preferredTheme || "auto");

      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to update theme",
      };
    }
  };

  const logout = async () => {
    setUser(null);
    setOtpPending(false);
    setPendingUserId(null);
    setIsVerifying(false);

    localStorage.removeItem("user");
    localStorage.removeItem("otpPending");
    localStorage.removeItem("pendingUserId");

    setThemePreference("auto");

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const verifyOtp = async (otp: string) => {
    if (!pendingUserId) {
      return {
        success: false,
        message: "Verification session expired",
      };
    }

    setIsVerifying(true);

    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        userId: pendingUserId,
        otp: String(otp).trim(),
      });

      login(response.data.result, response.data.selectedTheme);

      return { success: true };
    } catch (error: any) {
      console.error("OTP verification error:", error);

      return {
        success: false,
        message: error.response?.data?.message || "Invalid OTP",
      };
    } finally {
      setIsVerifying(false);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);

      return {
        success: true,
        user: result.user,
      };
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);

      return {
        success: false,
        message: error.message || "Google Sign-In failed",
        code: error.code,
      };
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedOtpPending = localStorage.getItem("otpPending");
    const savedPendingUserId = localStorage.getItem("pendingUserId");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;

        setUser(parsedUser);
        setThemePreference(parsedUser?.preferredTheme || "auto");
      } catch (error) {
        console.error("Saved user error:", error);
        localStorage.removeItem("user");
        setThemePreference("auto");
      }
    } else {
      setThemePreference("auto");
    }

    if (savedOtpPending === "true" && savedPendingUserId) {
      setOtpPending(true);
      setPendingUserId(savedPendingUserId);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;

      if (localStorage.getItem("otpPending") === "true") return;

      try {
        const payload = {
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          image:
            firebaseUser.photoURL ||
            "https://github.com/shadcn.png",
        };

        const response = await axiosInstance.post(
          "/user/login",
          payload
        );

        if (response.data.requiresOtp) {
          setOtpPending(true);
          setPendingUserId(response.data.userId);

          localStorage.setItem("otpPending", "true");
          localStorage.setItem(
            "pendingUserId",
            response.data.userId
          );

          return;
        }

        login(response.data.result, response.data.selectedTheme);
      } catch (error: any) {
        console.error(
          "Backend Login Error:",
          error.response?.data || error
        );
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        refreshUser,
        handlegooglesignin,
        otpPending,
        pendingUserId,
        isVerifying,
        verifyOtp,
        changeTheme,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType =>
  useContext(UserContext);