import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/axios";

const OtpVerification: React.FC = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email: string })?.email;

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    try {
      const res = await api.post("/auth/verify-otp", { email, otp: otp });

      if (res.status === 200) {
        navigate("/login");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-8 shadow-md rounded-xl">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          OTP Verification
        </h2>
        <p className="text-sm text-gray-600 text-center mb-4">
          Enter the 6-digit code sent to <strong>{email}</strong>
        </p>
        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-center tracking-widest text-lg"
        />
        {error && (
          <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
        )}

        <button
          onClick={handleVerify}
          className="w-full bg-teal-600 text-white mt-6 py-2 rounded-lg hover:bg-teal-700 transition"
        >
          Verify OTP
        </button>
      </div>
    </div>
  );
};

export default OtpVerification;
