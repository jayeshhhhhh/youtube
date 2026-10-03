import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  loading: boolean;
}

const OTPModal = ({ isOpen, onClose, onVerify, loading }: OTPModalProps) => {
  const [otp, setOtp] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Security Verification</CardTitle>
          <CardDescription>
            A new device or location was detected. Please enter the 6-digit OTP sent to your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Input
            type="text"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            className="text-center text-2xl tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex gap-2 justify-center">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onVerify(otp)} disabled={loading || otp.length !== 6}>
            {loading ? "Verifying..." : "Verify Code"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OTPModal;
