
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useState, createContext, useEffect, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpPending, setOtpPending] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const login = (userdata) => {
    setUser(userdata);

    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(userdata));
      localStorage.removeItem("otpPending");
      localStorage.removeItem("pendingUserId");
    }
  };

  const logout = async () => {
    setUser(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("otpPending");
      localStorage.removeItem("pendingUserId");
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const verifyOtp = async (otp) => {
    setIsVerifying(true);

    try {
      console.log(
        "Verifying OTP for userId:",
        pendingUserId,
        "with OTP:",
        otp
      );

      const response = await axiosInstance.post("/user/verify-otp", {
        userId: pendingUserId,
        otp: String(otp),
      });

      login(response.data.result);

      setOtpPending(false);
      setPendingUserId(null);

      if (typeof window !== "undefined") {
        localStorage.removeItem("otpPending");
        localStorage.removeItem("pendingUserId");
      }

      return { success: true };
    } catch (error) {
      console.error("OTP Verification Error:", error);

      return {
        success: false,
        message:
          error.response?.data?.message || "Invalid OTP",
      };
    } finally {
      setIsVerifying(false);
    }
  };

  const handlegooglesignin = async () => {
    try {
      console.log("Starting Google Sign-In...");

      const result = await signInWithPopup(auth, provider);

      console.log("Google Sign-In successful:", result.user);

      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      console.error("Google Sign-In Error:", error);

      return {
        success: false,
        message: error.message || "Google Sign-In failed",
        code: error.code,
      };
    }
  };

  useEffect(() => {
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

          const response = await axiosInstance.post(
            "/user/login",
            payload
          );

          console.log("Backend login response:", response.data);

          if (response.data.requiresOtp) {
            setOtpPending(true);
            setPendingUserId(response.data.userId);

            if (typeof window !== "undefined") {
              localStorage.setItem("otpPending", "true");
              localStorage.setItem(
                "pendingUserId",
                response.data.userId
              );
            }
          } else {
            login(response.data.result);
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
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

