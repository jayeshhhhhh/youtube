
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
import { useTheme } from "../context/ThemeContext";

const UserContext = createContext({
  user: /** @type {any} */ (null),
  logout: async () => {},
  handlegooglesignin: async () => {},
  login: (...args) => {},
  refreshUser: async () => {}
  otpPending: false,
  pendingUserId: null,
  isVerifying: false,
  verifyOtp: async () => ({ success: false }),
  changeTheme: async () => ({ success: false }),
});
export const UserProvider = ({ children }) => {
  const { setThemePreference } = useTheme();

  const [user, setUser] = useState(null);
  const [otpPending, setOtpPending] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const login = (userdata, selectedTheme) => {
  setUser(userdata);

  const preferredTheme =
    userdata?.preferredTheme || "auto";

  setThemePreference(preferredTheme);

  localStorage.setItem(
    "user",
    JSON.stringify(userdata)
  );

  localStorage.removeItem("otpPending");
  localStorage.removeItem("pendingUserId");
};

   

  const refreshUser = async () => {
    if (!user?._id) return;

    try {
      const response = await axiosInstance.get(
        `/user/${user._id}`
      );

      const updatedUser = response.data;

      setUser(updatedUser);

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      if (updatedUser?.preferredTheme) {
        setThemePreference(
          updatedUser.preferredTheme
        );
      }

      return updatedUser;
    } catch (error) {
      console.error(
        "User refresh error:",
        error
      );
    }
  };

  const changeTheme = async (selectedTheme) => {
    setThemePreference(selectedTheme);

    if (!user?._id) {
      return {
        success: true,
      };
    }

    try {
      const response =
        await axiosInstance.patch(
          `/user/update/${user._id}`,
          {
            preferredTheme: selectedTheme,
          }
        );

      const updatedUser = response.data;

      setUser(updatedUser);

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "Theme update error:",
        error
      );

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

    localStorage.removeItem("user");
    localStorage.removeItem("otpPending");
    localStorage.removeItem("pendingUserId");

    setThemePreference("auto");

    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  const verifyOtp = async (otp) => {
    if (!pendingUserId) {
      return {
        success: false,
        message: "Verification session expired",
      };
    }

    setIsVerifying(true);

    try {
      const response =
        await axiosInstance.post(
          "/user/verify-otp",
          {
            userId: pendingUserId,
            otp: String(otp).trim(),
          }
        );

      login(
        response.data.result,
        response.data.selectedTheme
      );

      setOtpPending(false);
      setPendingUserId(null);

      localStorage.removeItem("otpPending");
      localStorage.removeItem("pendingUserId");

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "OTP verification error:",
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
      const result =
        await signInWithPopup(
          auth,
          provider
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
      localStorage.getItem("user");

    const savedOtpPending =
      localStorage.getItem("otpPending");

    const savedPendingUserId =
      localStorage.getItem("pendingUserId");

    if (savedUser) {
      try {
        const parsedUser =
          JSON.parse(savedUser);

        setUser(parsedUser);

        setThemePreference(
          parsedUser?.preferredTheme || "auto"
        );
      } catch (error) {
        console.error(
          "Saved user error:",
          error
        );
      }
    } else {
      setThemePreference("auto");
    }

    if (
      savedOtpPending === "true" &&
      savedPendingUserId
    ) {
      setOtpPending(true);
      setPendingUserId(
        savedPendingUserId
      );
    }

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseuser) => {
          if (!firebaseuser) {
            return;
          }

          if (
            localStorage.getItem(
              "otpPending"
            ) === "true"
          ) {
            return;
          }

          try {
            const payload = {
              email:
                firebaseuser.email,
              name:
                firebaseuser.displayName,
              image:
                firebaseuser.photoURL ||
                "https://github.com/shadcn.png",
            };

            const response =
              await axiosInstance.post(
                "/user/login",
                payload
              );

            if (
              response.data.requiresOtp
            ) {
              setOtpPending(true);

              setPendingUserId(
                response.data.userId
              );

              localStorage.setItem(
                "otpPending",
                "true"
              );

              localStorage.setItem(
                "pendingUserId",
                response.data.userId
              );

              return;
            }

            login(
              response.data.result,
              response.data.selectedTheme
            );
          } catch (error) {
            console.error(
              "Backend Login Error:",
              error.response?.data ||
                error
            );
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

export const useUser = () =>
  useContext(UserContext);

