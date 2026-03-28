import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import api from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

interface PasswordlessFormInputs {
  phoneNumber: string;
  otp: string;
}

interface AuthResponse {
  accessToken: string;
  role: string;
  userName: string;
  userId: string;
}

const UserPasswordlessLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<PasswordlessFormInputs>({
    defaultValues: { phoneNumber: '+91', otp: '' },
  });

  const [isOtpSent, setIsOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOtpSent && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            if (timer) clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpSent, resendTimer]);

  const onSubmitPhone = async (data: PasswordlessFormInputs) => {
    try {
      const response = await api.post<AuthResponse>('/auth/passwordless-login', {
        phoneNumber: data.phoneNumber,
      });

      if (response.status === 200) {
        setPhoneNumber(data.phoneNumber);
        setIsOtpSent(true);
        setResendTimer(30);
        setCanResend(false);
        clearErrors();
      }
    } catch (error) {
      setError('phoneNumber', {
        type: 'manual',
        message: 'Failed to send OTP. Please check the phone number.',
      });
    }
  };

  const onSubmitOtp = async (data: PasswordlessFormInputs) => {
    try {
      const response = await api.post<AuthResponse>('/auth/verify-passwordless-otp', {
        phoneNumber,
        otp: data.otp,
      });

      if (response.status === 200 && response.data.accessToken) {
        const { accessToken, role, userName: username, userId } = response.data;
        const userIdNumber = Number(userId);

        if (isNaN(userIdNumber)) throw new Error('Invalid userId');

        login({ accessToken, role, username, userId: userIdNumber });

        if (role.toLowerCase() === 'user') {
          navigate('/home');
        }
      }
    } catch (error) {
      setError('otp', {
        type: 'manual',
        message: 'Invalid or expired OTP',
      });
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      const response = await api.post<AuthResponse>('/auth/passwordless-login', {
        phoneNumber,
      });

      if (response.status === 200) {
        setResendTimer(30);
        setCanResend(false);
        clearErrors();
      }
    } catch (error) {
      setError('phoneNumber', {
        type: 'manual',
        message: 'Failed to resend OTP. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Food Image */}
      <div className="md:w-1/2 w-full h-64 md:h-auto relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/1667427/pexels-photo-1667427.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
          alt="Happy Journey Food"
          className="object-cover w-full h-full absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-transparent" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Happy Journey
          </h2>
          <p className="text-white/90 mt-3 text-lg max-w-sm">
            Sizzling Meals, Delivered to Your Doorstep!
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="md:w-1/2 w-full flex items-center justify-center bg-white py-12 px-6 md:px-12">
        <div className="w-full max-w-md">

          {/* Welcome Back Section */}
          <div className="mb-10">
            <h1 className="text-5xl font-bold text-gray-900 tracking-tighter">
              Welcome Back
            </h1>
            <p className="mt-3 text-lg text-gray-600">
              Sign in to continue where you left off and enjoy your favorite meals.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
            role="region"
            aria-label="Happy Journey login form"
          >
            <form
              onSubmit={handleSubmit(isOtpSent ? onSubmitOtp : onSubmitPhone)}
              className="space-y-7"
              noValidate
            >
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  {...register('phoneNumber', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+91\d{10}$/,
                      message: 'Enter a valid 10-digit Indian phone number (e.g., +919876543210)',
                    },
                  })}
                  className={`w-full px-5 py-4 border rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all bg-white placeholder-gray-400 ${
                    errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+919876543210"
                  disabled={isOtpSent || isSubmitting}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-500 mt-1.5">{errors.phoneNumber.message}</p>
                )}
              </div>

              {isOtpSent && (
                <>
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Enter OTP
                    </label>
                    <input
                      id="otp"
                      type="text"
                      {...register('otp', {
                        required: 'OTP is required',
                        pattern: {
                          value: /^\d{4,6}$/,
                          message: 'OTP must be 4-6 digits',
                        },
                      })}
                      className={`w-full px-5 py-4 border rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all bg-white placeholder-gray-400 ${
                        errors.otp ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter 4-6 digit OTP"
                      autoFocus
                    />
                    {errors.otp && (
                      <p className="text-sm text-red-500 mt-1.5">{errors.otp.message}</p>
                    )}
                  </div>

                  <div className="text-center text-sm">
                    {resendTimer > 0 ? (
                      <p className="text-gray-500">Resend OTP in {resendTimer} seconds</p>
                    ) : canResend && (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-teal-600 hover:underline font-medium"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 rounded-2xl text-white font-semibold text-lg transition-all duration-300 ${
                  isSubmitting
                    ? 'bg-teal-600/70 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>{isOtpSent ? 'Verify OTP' : 'Send OTP'}</>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserPasswordlessLogin;