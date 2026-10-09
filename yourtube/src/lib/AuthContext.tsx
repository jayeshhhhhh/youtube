
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
type ThemePreference = "light" | "dark" | "auto";
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
  login: (userdata: User, selectedTheme?: ThemePreference) => void;
  changeTheme: (selectedTheme: ThemePreference) => Promise<any>;
  refreshUser: () => Promise<any>;
  otpPending: boolean;
  pendingUserId: string | null;
  isVerifying: boolean;
  verifyOtp: (otp: string) => Promise<any>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  logout: async () => { },
  handlegooglesignin: async () => ({ success: false }),
  login: () => { },
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
      setThemePreference(
        (updatedUser?.preferredTheme || "auto") as ThemePreference
      );
      return updatedUser;
    } catch (error) {
      console.error("User refresh error:", error);
      return null;
    }
  };

  
const changeTheme = async (selectedTheme: ThemePreference) => {
  const previousTheme = (user?.preferredTheme || "auto") as ThemePreference;

  // Update UI immediately
  setThemePreference(selectedTheme);

  if (!user?._id) {
    localStorage.setItem(
      "user",
      JSON.stringify({ ...user, preferredTheme: selectedTheme })
    );
    return { success: true };
  }

  try {
    const response = await axiosInstance.patch(
      `/user/update/${user._id}`,
      { preferredTheme: selectedTheme }
    );

    // Support APIs that return either the user or a success message
    const responseUser = response.data?.user || response.data?.result || response.data;

    const updatedUser =
      responseUser && typeof responseUser === "object" && responseUser._id
        ? responseUser
        : { ...user, preferredTheme: selectedTheme };

    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setThemePreference(selectedTheme);

    return { success: true };
  } catch (error: any) {
    console.error("Theme update failed:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      message: error.message,
    });

    setThemePreference(previousTheme);

    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
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
        setThemePreference(
          (parsedUser?.preferredTheme || "auto") as "light" | "dark" | "auto"
        );
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