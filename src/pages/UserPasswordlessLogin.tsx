import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Train } from 'lucide-react';
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
  const [resendTimer, setResendTimer] = useState(30); // 30 seconds cooldown
  const [canResend, setCanResend] = useState(false);

  // Timer effect for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOtpSent && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer!);
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
        setResendTimer(30); // Reset timer when OTP is sent
        setCanResend(false);
        clearErrors();
      } else {
        throw new Error('Failed to send OTP');
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
      console.log('API Response:', response.data); // Log for debugging
      if (response.status === 200 && response.data.accessToken) {
        const { accessToken, role, userName: username, userId } = response.data;
        const userIdNumber = Number(userId);
        if (isNaN(userIdNumber)) {
          throw new Error('Invalid userId: cannot convert to a number');
        }
        login({ accessToken, role, username, userId: userIdNumber });

        if (role.toLowerCase() === 'user') {
          navigate('/home');
        } else {
          throw new Error('Invalid role for user login');
        }
      } else {
        throw new Error('Invalid OTP response');
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
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
        setResendTimer(30); // Reset timer on resend
        setCanResend(false);
        clearErrors();
      } else {
        throw new Error('Failed to resend OTP');
      }
    } catch (error) {
      setError('phoneNumber', {
        type: 'manual',
        message: 'Failed to resend OTP. Please try again.',
      });
    }
  };

  // Generate random stars for the background
  const generateStars = () => {
    const stars = [];
    for (let i = 0; i < 150; i++) {
      const style = {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        width: `${Math.random() * 2}px`,
        height: `${Math.random() * 2}px`,
        opacity: Math.random(),
        animationDelay: `${Math.random() * 10}s`,
      };
      stars.push(<div key={i} className="star absolute bg-white rounded-full" style={style} />);
    }
    return stars;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900">
      {/* Galaxy and Nebula Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Nebula base layers */}
        <div className="absolute inset-0 opacity-40">
          <div className="nebula-1 absolute w-full h-full bg-purple-900/70 rounded-full filter blur-3xl mix-blend-screen" />
          <div className="nebula-2 absolute w-full h-full bg-blue-900/70 rounded-full filter blur-3xl mix-blend-screen" />
          <div className="nebula-3 absolute w-full h-full bg-pink-900/70 rounded-full filter blur-3xl mix-blend-screen" />
        </div>
        
        {/* Animated stars */}
        {generateStars()}
        
        {/* Large twinkling stars */}
        <div className="twinkling-stars">
          {[...Array(15)].map((_, i) => (
            <div 
              key={`twinkle-${i}`} 
              className="absolute bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`,
                animationDuration: `${3 + Math.random() * 7}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .star {
          animation: twinkle var(--duration, 5s) infinite ease-in-out;
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        
        .nebula-1 {
          top: -50%;
          left: -50%;
          width: 150%;
          height: 150%;
          animation: drift 80s linear infinite;
        }
        
        .nebula-2 {
          top: -30%;
          left: -30%;
          width: 120%;
          height: 120%;
          animation: drift 100s linear infinite reverse;
        }
        
        .nebula-3 {
          top: -40%;
          left: -20%;
          width: 130%;
          height: 130%;
          animation: drift 120s linear infinite;
        }
        
        @keyframes drift {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(5%, 5%) rotate(5deg); }
          50% { transform: translate(10%, 0) rotate(0deg); }
          75% { transform: translate(5%, -5%) rotate(-5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4 p-6 relative z-10"
        role="region"
        aria-label="happy journey login form"
      >
        <div className="flex items-center justify-center mb-6">
          <Train className="h-8 w-8 text-blue-300 mr-2" aria-hidden="true" />
          <h2 className="text-3xl font-bold text-white">Happy Journey</h2>
        </div>
        <p className="text-center text-blue-100 mb-8 text-sm">
          Sizzling Meals, Delivered to Your Train Seat!
        </p>

        <form
          onSubmit={handleSubmit(isOtpSent ? onSubmitOtp : onSubmitPhone)}
          className="space-y-6"
          noValidate
        >
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-blue-100 mb-1"
            >
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
              className={`w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition-all duration-300 ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-700'
              }`}
              placeholder="+919876543210"
              disabled={isOtpSent || isSubmitting}
              aria-invalid={errors.phoneNumber ? 'true' : 'false'}
              aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined}
            />
            {errors.phoneNumber && (
              <p id="phoneNumber-error" className="text-sm text-red-400 mt-1">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {isOtpSent && (
            <>
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-blue-100 mb-1"
                >
                  OTP
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
                  className={`w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400 transition-all duration-300 ${
                    errors.otp ? 'border-red-500' : 'border-gray-700'
                  }`}
                  placeholder="Enter OTP"
                  autoFocus
                  aria-invalid={errors.otp ? 'true' : 'false'}
                  aria-describedby={errors.otp ? 'otp-error' : undefined}
                />
                {errors.otp && (
                  <p id="otp-error" className="text-sm text-red-400 mt-1">
                    {errors.otp.message}
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-200/80">
                  {resendTimer > 0
                    ? `Resend OTP in ${resendTimer} seconds`
                    : canResend && (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          className="text-blue-300 hover:underline font-medium"
                          aria-label="Resend OTP"
                        >
                          Resend OTP
                        </button>
                      )}
                </p>
              </div>
            </>
          )}

          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`w-full flex items-center justify-center py-3 rounded-lg text-white font-medium transition-colors duration-300 ${
              isSubmitting ? 'bg-blue-600/70 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            aria-label={isOtpSent ? 'Verify OTP' : 'Send OTP'}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              <>{isOtpSent ? 'Verify OTP' : 'Send OTP'}</>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default UserPasswordlessLogin;