"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import Portal from "@/components/ui/portal";
import Button from "@/components/ui/Button";
import { authApi } from "@/lib/axios";

const OTP_LENGTH = 6;

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  userId: string | null;
  onVerificationSuccess: (message: string, csdNumber?: string) => void;
}

export default function OtpVerificationModal({
  isOpen,
  onClose,
  email,
  userId,
  onVerificationSuccess,
}: OtpVerificationModalProps) {
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  const handleOtpCodeChange = (value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtpCode(sanitized);
    setOtpError(null);
  };

  const handleResendOtp = async () => {
    if (!email) return;
    setResendingOtp(true);
    setOtpError(null);
    setOtpInfo(null);

    try {
      const response = await authApi.resendOtp(email);
      setOtpInfo(response.message ?? `A new verification code was sent to ${email}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend verification code";
      setOtpError(message);
    } finally {
      setResendingOtp(false);
    }
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !userId) return;

    if (otpCode.length !== OTP_LENGTH) {
      setOtpError(`Enter the ${OTP_LENGTH}-digit code sent to ${email}.`);
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const response = await authApi.verifyOtp({ email, otp: otpCode });
      const successMessage = `${response.message ?? "User verified successfully."} Generated CSD number: ${response.csdNumber}.`;
      onVerificationSuccess(successMessage, response.csdNumber);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify OTP";
      setOtpError(message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleClose = () => {
    if (verifyingOtp) return;
    setOtpCode("");
    setOtpError(null);
    setOtpInfo(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full max-w-[95vw] sm:max-w-md rounded-2xl bg-white p-6 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#004B5B]">Verify new account</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Enter the {OTP_LENGTH}-digit verification code sent to <strong>{email}</strong> to
              activate their access.
            </p>

            <form className="space-y-4" onSubmit={handleOtpSubmit}>
              <div>
                <label className="block text-sm font-medium text-[#004B5B]" htmlFor="otp-code">
                  Verification code
                </label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(event) => handleOtpCodeChange(event.target.value)}
                  disabled={verifyingOtp}
                  className="mt-2 w-full rounded-xl border border-[#004B5B]/40 px-4 py-3 text-lg tracking-[0.5em] text-center text-[#004B5B] placeholder:text-gray-400 focus:border-[#004B5B] focus:outline-none focus:ring-2 focus:ring-[#004B5B]/30"
                  placeholder={"•".repeat(OTP_LENGTH)}
                />
              </div>

              {otpError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {otpError}
                </div>
              )}

              {otpInfo && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {otpInfo}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => void handleResendOtp()}
                  disabled={resendingOtp || verifyingOtp}
                  className="text-sm font-semibold text-[#004B5B] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendingOtp ? "Sending a new code..." : "Resend verification code"}
                </button>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="px-4 py-2"
                    onClick={handleClose}
                    disabled={verifyingOtp}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="px-4 py-2 bg-[#004B5B] hover:bg-[#006B85] text-white"
                    disabled={verifyingOtp}
                  >
                    {verifyingOtp ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}