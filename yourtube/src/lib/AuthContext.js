import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpPending, setOtpPending] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const verifyOtp = async (otp) => {
    setIsVerifying(true);
    try {
      console.log("Verifying OTP for userId:", pendingUserId, "with OTP:", otp);
      const response = await axiosInstance.post("/user/verify-otp", {
        userId: pendingUserId,
        otp: String(otp),
      });
      login(response.data.result);
      setOtpPending(false);
      setPendingUserId(null);
      return { success: true };
    } catch (error) {
      console.error("OTP Verification Error:", error);
      return { success: false, message: error.response?.data?.message || "Invalid OTP" };
    } finally {
      setIsVerifying(false);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);

      if (response.data.requiresOtp) {
        setOtpPending(true);
        setPendingUserId(response.data.userId);
      } else {
        login(response.data.result);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);

          if (response.data.requiresOtp) {
            setOtpPending(true);
            setPendingUserId(response.data.userId);
          } else {
            login(response.data.result);
          }
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider value={{
      user,
      login,
      logout,
      handlegooglesignin,
      otpPending,
      pendingUserId,
      isVerifying,
      verifyOtp
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
