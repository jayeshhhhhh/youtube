import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { WatchPartyProvider } from "../context/WatchPartyContext";
import OTPModal from "@/components/OTPModal";
import { useUser } from "@/lib/AuthContext";

const AppContent = ({ Component, pageProps }: any) => {
  const {
    otpPending,
    verifyOtp,
    isVerifying,
  } = useUser();

  const handleVerify = async (otpValue: string) => {
    const result = await verifyOtp(otpValue);

    if (!result.success) {
      alert(result.message);
    }
  };

  return (
    <>
   <div className="min-h-screen bg-white text-black dark:bg-[#181818] dark:text-black">
        <title>Your-Tube Clone</title>

        <Header />

        <Toaster />

        <div className="flex">
          <Sidebar />
          <Component {...pageProps} />
        </div>
      </div>

      <OTPModal
        isOpen={otpPending}
        onClose={() => {}}
        onVerify={handleVerify}
        loading={isVerifying}
      />
    </>
  );
};

export default function App({
  Component,
  pageProps,
}: AppProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <WatchPartyProvider>
          <AppContent
            Component={Component}
            pageProps={pageProps}
          />
        </WatchPartyProvider>
      </UserProvider>
    </ThemeProvider>
  );
}