import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  useState,
  createContext,
  useEffect,
  useContext,
} from "react";

import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

const applyTheme = (theme) => {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  root.classList.remove("light", "dark");

  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.add("light");
  }

  localStorage.setItem("theme", theme);
};

const getAutomaticTheme = () => {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(
    parts.find((part) => part.type === "hour")?.value || 0
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")?.value || 0
  );

  const totalMinutes = hour * 60 + minute;

  if (
    totalMinutes >= 10 * 60 &&
    totalMinutes <= 12 * 60
  ) {
    return "light";
  }

  return "dark";
};

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpPending, setOtpPending] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [theme, setTheme] = useState("dark");

  const login = (userdata, selectedTheme) => {
    setUser(userdata);

    let finalTheme = selectedTheme;

    if (!finalTheme) {
      if (userdata?.preferredTheme === "light") {
        finalTheme = "light";
      } else if (userdata?.preferredTheme === "dark") {
        finalTheme = "dark";
      } else {
        finalTheme = getAutomaticTheme();
      }
    }

    setTheme(finalTheme);
    applyTheme(finalTheme);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "user",
        JSON.stringify(userdata)
      );

      localStorage.setItem("theme", finalTheme);

      localStorage.removeItem("otpPending");
      localStorage.removeItem("pendingUserId");
    }
  };

  const changeTheme = async (newTheme) => {
    if (
      newTheme !== "light" &&
      newTheme !== "dark" &&
      newTheme !== "auto"
    ) {
      return {
        success: false,
        message: "Invalid theme",
      };
    }

    try {
      if (newTheme === "auto") {
        const automaticTheme = getAutomaticTheme();

        applyTheme(automaticTheme);
        setTheme(automaticTheme);
      } else {
        applyTheme(newTheme);
        setTheme(newTheme);
      }

      if (user?._id) {
        const response = await axiosInstance.patch(
          `/user/update/${user._id}`,
          {
            preferredTheme: newTheme,
          }
        );

        const updatedUser = response.data;

        setUser(updatedUser);

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "user",
            JSON.stringify(updatedUser)
          );
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("Theme update error:", error);

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

    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("otpPending");
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("theme");
    }

    applyTheme("dark");

    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Error during sign out:",
        error
      );
    }
  };

  const verifyOtp = async (otp) => {
    setIsVerifying(true);

    try {
      const response = await axiosInstance.post(
        "/user/verify-otp",
        {
          userId: pendingUserId,
          otp: String(otp),
        }
      );

      login(
        response.data.result,
        response.data.selectedTheme
      );

      setOtpPending(false);
      setPendingUserId(null);

      if (typeof window !== "undefined") {
        localStorage.removeItem("otpPending");
        localStorage.removeItem("pendingUserId");
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "OTP Verification Error:",
        error
      );

      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Invalid OTP",
      };
    } finally {
      setIsVerifying(false);
    }
  };

  const handlegooglesignin = async () => {
    try {
      console.log("Starting Google Sign-In...");

      const result = await signInWithPopup(
        auth,
        provider
      );

      console.log(
        "Google Sign-In successful:",
        result.user
      );

      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      console.error(
        "Google Sign-In Error:",
        error
      );

      return {
        success: false,
        message:
          error.message ||
          "Google Sign-In failed",
        code: error.code,
      };
    }
  };

  useEffect(() => {
    const savedUser =
      typeof window !== "undefined"
        ? localStorage.getItem("user")
        : null;

    const savedTheme =
      typeof window !== "undefined"
        ? localStorage.getItem("theme")
        : null;

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);

        setUser(parsedUser);

        if (
          parsedUser.preferredTheme === "light"
        ) {
          setTheme("light");
          applyTheme("light");
        } else if (
          parsedUser.preferredTheme === "dark"
        ) {
          setTheme("dark");
          applyTheme("dark");
        } else if (savedTheme) {
          setTheme(savedTheme);
          applyTheme(savedTheme);
        } else {
          const automaticTheme =
            getAutomaticTheme();

          setTheme(automaticTheme);
          applyTheme(automaticTheme);
        }
      } catch (error) {
        console.error(
          "Saved user parsing error:",
          error
        );
      }
    } else {
      const automaticTheme =
        getAutomaticTheme();

      setTheme(automaticTheme);
      applyTheme(automaticTheme);
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseuser) => {
        if (!firebaseuser) {
          setUser(null);
          setOtpPending(false);
          setPendingUserId(null);
          return;
        }

        try {
          console.log(
            "Firebase user:",
            firebaseuser.email
          );

          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image:
              firebaseuser.photoURL ||
              "https://github.com/shadcn.png",
          };

          const response =
            await axiosInstance.post(
              "/user/login",
              payload
            );

          console.log(
            "Backend login response:",
            response.data
          );

          if (response.data.requiresOtp) {
            setOtpPending(true);
            setPendingUserId(
              response.data.userId
            );

            if (
              typeof window !== "undefined"
            ) {
              localStorage.setItem(
                "otpPending",
                "true"
              );

              localStorage.setItem(
                "pendingUserId",
                response.data.userId
              );
            }
          } else {
            login(
              response.data.result,
              response.data.selectedTheme
            );
          }
        } catch (error) {
          console.error(
            "Backend Login Error:",
            error.response?.data || error
          );

          await logout();
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        otpPending,
        pendingUserId,
        isVerifying,
        verifyOtp,
        theme,
        changeTheme,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export { UserProvider };

export const useUser = () =>
  useContext(UserContext);