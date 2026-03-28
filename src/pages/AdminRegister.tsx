import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import api from "../utils/axios";

type RegisterFormInputs = {
  email: string;
  username: string;
  phoneNumber: string; // This will store only the 10 digits
  password: string;
};

const UserRegister: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
    clearErrors,
  } = useForm<RegisterFormInputs>();
  const [showPassword, setShowPassword] = useState(false);
  const [displayPhoneValue, setDisplayPhoneValue] = useState(""); // Only for display

  const email = watch("email");
  const phoneNumber = watch("phoneNumber");

  const validateEmailOrPhone = () => {
    if (!email && !phoneNumber) {
      return "Either email or phone number is required";
    }
    return true;
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setDisplayPhoneValue(value);
    setValue("phoneNumber", value, { shouldValidate: true });

    // Clear phone number errors when valid
    if (value.length === 10) {
      clearErrors("phoneNumber");
    }
  };

  const onSubmit = async (data: RegisterFormInputs) => {
    try {
      const res = await api.post("/auth/register", { 
        ...data, 
        phoneNumber: data.phoneNumber, // Just the 10 digits
        role: "ROLE_ADMIN" 
      });

      if (res.status === 200) {
        navigate("/verify-otp", {
          state: {
            email: data.email || "+91" + data.phoneNumber,
            message: "OTP sent successfully",
          },
        });
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        setError("email", {
          type: "manual",
          message: error.response.data.message,
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Sign Up
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              {...register("email", {
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Invalid email format",
                },
                validate: validateEmailOrPhone,
              })}
              className={`w-full px-4 py-2 border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                +91
              </span>
              <input
                type="tel"
                value={displayPhoneValue}
                {...register("phoneNumber", {
                  validate: {
                    required: (value) => {
                      if (!email && !value) return "Either email or phone is required";
                      return true;
                    },
                    length: (value) => {
                      if (value && value.length !== 10) return "Phone number must be exactly 10 digits";
                      return true;
                    }
                  }
                })}
                onChange={handlePhoneInput}
                className={`w-full pl-12 pr-4 py-2 border ${
                  errors.phoneNumber ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.phoneNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              {...register("username", { required: "Username is required" })}
              className={`w-full px-4 py-2 border ${
                errors.username ? "border-red-500" : "border-gray-300"
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
            />
            {errors.username && (
              <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password", { required: "Password is required" })}
                className={`w-full px-4 py-2 border ${
                  errors.password ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible className="h-5 w-5" />
                ) : (
                  <AiOutlineEye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition"
          >
            Register
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-teal-600 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};

export default UserRegister;