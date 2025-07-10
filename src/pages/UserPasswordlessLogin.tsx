import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import api from "../utils/axios";
import { useAuth } from "../contexts/AuthContext";

type PasswordlessFormInputs = {
  phoneNumber: string;
  otp: string;
};

const UserPasswordlessLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<PasswordlessFormInputs>();
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const onSubmitPhone = async (data: PasswordlessFormInputs) => {
    try {
      const response = await api.post("/auth/passwordless-login", {
        phoneNumber: data.phoneNumber,
      });
      if (response.status === 200) {
        setPhoneNumber(data.phoneNumber);
        setIsOtpSent(true);
        clearErrors();
      } else {
        throw new Error("Failed to send OTP");
      }
    } catch (error) {
      setError("phoneNumber", {
        type: "manual",
        message: "Failed to send OTP. Please check the phone number.",
      });
    }
  };

  const onSubmitOtp = async (data: PasswordlessFormInputs) => {
    try {
      const response = await api.post("/auth/verify-passwordless-otp", {
        phoneNumber,
        otp: data.otp,
      });
      if (response.status === 200 && response.data.accessToken) {
        const { accessToken, role, userName: username, userId } = response.data;
        login({
          accessToken,
          role,
          username,
          userId,
        });

        // Redirect based on role (case-insensitive)
        const normalizedRole = role.toLowerCase();
        if (normalizedRole === "user") {
          navigate("/home");
        } else {
          throw new Error("Invalid role for user login");
        }
      } else {
        throw new Error("Invalid OTP response");
      }
    } catch (error) {
      setError("otp", {
        type: "manual",
        message: "Invalid or expired OTP",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          `` Login
        </h2>

        <form
          onSubmit={handleSubmit(isOtpSent ? onSubmitOtp : onSubmitPhone)}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number
            </label>
            <input
              id="phoneNumber"
              type="tel"
              {...register("phoneNumber", {
                required: "Phone number is required",
                pattern: {
                  value: /^\+?[1-9]\d{1,14}$/,
                  message: "Invalid phone number format",
                },
              })}
              className={`w-full px-4 py-2 border ${
                errors.phoneNumber ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="+1234567890"
              disabled={isOtpSent}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-500 mt-1">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {isOtpSent && (
            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                OTP
              </label>
              <input
                id="otp"
                type="text"
                {...register("otp", {
                  required: "OTP is required",
                  pattern: {
                    value: /^\d{4,6}$/,
                    message: "OTP must be 4-6 digits",
                  },
                })}
                className={`w-full px-4 py-2 border ${
                  errors.otp ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter OTP"
              />
              {errors.otp && (
                <p className="text-sm text-red-500 mt-1">{errors.otp.message}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {isOtpSent ? "Verify OTP" : "Send OTP"}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500 text-center">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
};

export default UserPasswordlessLogin;