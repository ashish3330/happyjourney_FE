import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/axios";

const DIGIT_COUNT = 6;

const OtpVerification: React.FC = () => {
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email: string })?.email;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError("");
    if (value && index < DIGIT_COUNT - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGIT_COUNT);
    const newDigits = Array(DIGIT_COUNT).fill("");
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    refs.current[Math.min(pasted.length, DIGIT_COUNT - 1)]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length !== DIGIT_COUNT) {
      setError("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      if (res.status === 200) navigate("/login");
    } catch {
      setError("Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const allFilled = digits.every(Boolean);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f8] px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl px-8 py-10">

        {/* Icon badge */}
        <div className="flex justify-center mb-7">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="16" rx="3" stroke="white" strokeWidth="2.2" fill="none"/>
              <path d="M4 13 L16 20 L28 13" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-gray-900 text-center tracking-tight">
          Verify your email
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-8 leading-relaxed">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-gray-800">{email || "your email"}</span>
        </p>

        {/* 6-digit OTP boxes */}
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-11 h-13 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none transition-all duration-150 ${
                error
                  ? "border-red-400 bg-red-50 text-red-600"
                  : d
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-gray-200 bg-gray-50 text-gray-900 focus:border-teal-400 focus:bg-white"
              }`}
              style={{ height: "3.25rem" }}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-500 text-center mt-3">⚠ {error}</p>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || !allFilled}
          className={`w-full py-3.5 rounded-xl text-white font-bold text-base mt-7 transition-all duration-200 shadow-sm ${
            loading
              ? "bg-teal-400 cursor-not-allowed"
              : allFilled
              ? "bg-teal-600 hover:bg-teal-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Verifying…
            </span>
          ) : (
            "Verify & Continue →"
          )}
        </button>

        {/* Divider */}
        <div className="mt-7 h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent" />

        <p className="mt-4 text-center text-xs text-gray-400">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-teal-600 font-semibold hover:underline underline-offset-2"
          >
            Go back
          </button>
        </p>
      </div>
    </div>
  );
};

export default OtpVerification;
