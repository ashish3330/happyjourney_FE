import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HappyJourneyLogoDark from '../assets/HappyJourney_Logo_Dark.svg';
import HappyJourneyLogo from '../assets/HappyJourney_Logo.svg';
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
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ══════════════════════════════════════
          LEFT — Brand panel
      ══════════════════════════════════════ */}
      <div className="lg:w-[45%] w-full h-52 lg:h-auto relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/1667427/pexels-photo-1667427.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
          alt=""
          className="object-cover w-full h-full absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950/95 via-gray-900/85 to-black/90" />

        <div className="relative z-10 h-full flex flex-col px-10 py-10 justify-between">
          {/* Logo */}
          <img src={HappyJourneyLogoDark} alt="HappyJourney" className="h-14 w-auto object-contain" />

          {/* Copy — desktop only */}
          <div className="hidden lg:block">
            <h2 className="text-[2.6rem] font-extrabold text-white leading-[1.15] tracking-tight">
              Your next<br />meal is just<br />a tap away.
            </h2>
            <p className="mt-4 text-white/60 text-[15px] leading-relaxed max-w-xs">
              Fresh, hot food delivered right to your doorstep across India.
            </p>

            <div className="mt-10 space-y-5">
              {[
                { icon: '🍽️', title: '500+ Partner Restaurants', sub: 'Curated local & cloud kitchens' },
                { icon: '📍', title: '400+ Cities Covered',       sub: 'Pan-India delivery network'    },
                { icon: '✅', title: '100% FSSAI Certified',      sub: 'Safe, hygienic, verified food' },
              ].map(({ icon, title, sub }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{icon}</span>
                  <div>
                    <p className="text-white text-sm font-semibold leading-none mb-1">{title}</p>
                    <p className="text-white/50 text-xs">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="hidden lg:block text-white/25 text-xs">
            © {new Date().getFullYear()} HappyJourney. All rights reserved.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT — Form panel
      ══════════════════════════════════════ */}
      <div className="lg:w-[55%] w-full flex items-center justify-center bg-[#f4f6f8] py-12 px-5 md:px-10">
        <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-lg px-8 py-10 md:px-10 md:py-12">

          {/* Mobile-only logo */}
          <div className="lg:hidden mb-7 flex justify-center">
            <img src={HappyJourneyLogo} alt="HappyJourney" className="h-9 w-auto object-contain" />
          </div>

          {/* Step indicator */}
          <div className="flex items-center mb-8">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-300 ${!isOtpSent ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
              1
            </div>
            <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-500 ${isOtpSent ? 'bg-teal-500' : 'bg-gray-200'}`} />
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-500 ${isOtpSent ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              2
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {isOtpSent ? 'Verify your number' : 'Sign in to continue'}
            </h1>
            <p className="mt-1.5 text-gray-500 text-sm">
              {isOtpSent
                ? `We sent a code to ${phoneNumber}`
                : 'Enter your mobile number to get started'}
            </p>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            role="region"
            aria-label="Happy Journey login form"
          >
            <form
              onSubmit={handleSubmit(isOtpSent ? onSubmitOtp : onSubmitPhone)}
              className="space-y-5"
              noValidate
            >
              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  {...register('phoneNumber', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+91\d{10}$/,
                      message: 'Enter a valid 10-digit Indian number (e.g. +919876543210)',
                    },
                  })}
                  className={`w-full px-4 py-3.5 border-2 rounded-xl text-base font-medium focus:outline-none focus:border-teal-500 transition-colors bg-gray-50 placeholder-gray-300 ${
                    errors.phoneNumber ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="+919876543210"
                  disabled={isOtpSent || isSubmitting}
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-red-500 mt-1.5">⚠ {errors.phoneNumber.message}</p>
                )}
              </div>

              {isOtpSent && (
                <>
                  <div>
                    <label htmlFor="otp" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      One-Time Password
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      {...register('otp', {
                        required: 'OTP is required',
                        pattern: { value: /^\d{4,6}$/, message: 'OTP must be 4–6 digits' },
                      })}
                      className={`w-full px-4 py-3.5 border-2 rounded-xl text-xl font-bold text-center tracking-[0.5em] focus:outline-none focus:border-teal-500 transition-colors bg-gray-50 placeholder-gray-300 ${
                        errors.otp ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                      placeholder="······"
                      autoFocus
                    />
                    {errors.otp && (
                      <p className="text-xs text-red-500 mt-1.5">⚠ {errors.otp.message}</p>
                    )}
                  </div>

                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <p className="text-gray-400 text-xs">
                        Resend OTP in <span className="font-semibold text-teal-600">{resendTimer}s</span>
                      </p>
                    ) : canResend && (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-teal-600 hover:text-teal-700 text-sm font-semibold underline underline-offset-2"
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
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-base transition-all duration-200 shadow-sm ${
                  isSubmitting ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Processing…
                  </span>
                ) : (
                  isOtpSent ? 'Verify & Sign In →' : 'Send OTP →'
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Footer */}
          <p className="mt-7 text-center text-[11px] text-gray-400 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-teal-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy-policy" className="text-teal-600 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserPasswordlessLogin;