'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { API_ENDPOINTS, ROUTES, VALIDATION } from '@/lib/constants';
import Image from 'next/image';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      verifyToken(tokenParam);
    } else {
      setError('Invalid reset link. Please request a new password reset.');
      setVerifying(false);
    }
  }, [searchParams]);

  const verifyToken = async (resetToken) => {
    try {
      await axios.post(API_ENDPOINTS.AUTH.VERIFY_RESET_TOKEN, {
        token: resetToken,
      });
      setTokenValid(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired reset link.');
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const validatePassword = () => {
    if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
      setError(`Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters long`);
      return false;
    }

    if (!VALIDATION.PASSWORD.PATTERN.test(password)) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      await axios.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        token,
        password,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(ROUTES.LOGIN);
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to reset password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004072] mb-4"></div>
            <p className="text-gray-600">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className='min-h-screen flex flex-col bg-white lg:flex lg:flex-row'>
        <div className="relative bg-[url('/leftcover.svg')] bg-no-repeat bg-blend-multiply bg-[#19ADB8]/90 bg-blend-darken bg-cover bg-center lg:w-[30%] flex items-center justify-center animate-fade-in-left delay-400">        <div className="absolute top-10 left-6">
          <Image
            alt="icon"
            src="surgicon.svg"
            loading="eager"
            className="w-auto h-auto"
            width={10}
            height={10}
          />
        </div>
        </div>
        <div className='flex flex-col justify-center items-center lg:w-[70%] bg-white relative'>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href={ROUTES.FORGOT_PASSWORD}
              className="inline-block bg-[#004071] hover:bg-[#003359] text-white px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className='min-h-screen flex flex-col bg-white lg:flex lg:flex-row'>
        <div className="relative bg-[url('/leftcover.svg')] bg-no-repeat bg-blend-multiply bg-[#19ADB8]/90 bg-blend-darken bg-cover bg-center lg:w-[30%] flex items-center justify-center animate-fade-in-left delay-400">        <div className="absolute top-10 left-6">
          <Image
            alt="icon"
            src="surgicon.svg"
            loading="eager"
            className="w-auto h-auto"
            width={10}
            height={10}
          />
        </div>
        </div>
        <div className='flex flex-col justify-center items-center lg:w-[70%] bg-white relative'>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h1>
            <p className="text-gray-600 mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
            <Link
              href={ROUTES.LOGIN}
              className="inline-block bg-[#004072] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#003359] transition-all"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex flex-col bg-white lg:flex lg:flex-row'>
      <div className="relative bg-[url('/leftcover.svg')] bg-no-repeat bg-blend-multiply bg-[#19ADB8]/90 bg-blend-darken bg-cover bg-center lg:w-[30%] flex items-center justify-center animate-fade-in-left delay-400">        <div className="absolute top-10 left-6">
        <Image
          alt="icon"
          src="surgicon.svg"
          loading="eager"
          className="w-auto h-auto"
          width={10}
          height={10}
        />
      </div>
      </div>

      <div className='flex flex-col justify-center items-center lg:w-[70%] bg-white relative'>
        <div className='md:w-full w-70 max-w-[420px] px-8 absolute top-15 lg:top-50'>
          <div className='lg:mb-5'>
            <h1 className='text-[#202020] text-[32px] font-semibold'>New Password</h1>
            <p className="text-[#5A5A5A]">
              Please create a new password that you don’t use on any other site.            </p>
          </div>
          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                  className='border-[#DCDCDC] border rounded-lg w-full h-[52px] px-4 text-[15px] placeholder-[#898989] focus:outline-none focus:border-[#19ADB8] focus:ring-1 focus:ring-[#19ADB8] transition-colors'
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading}
                className='border-[#DCDCDC] border rounded-lg w-full h-[52px] px-4 text-[15px] placeholder-[#898989] focus:outline-none focus:border-[#19ADB8] focus:ring-1 focus:ring-[#19ADB8] transition-colors'
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className='bg-[#004071] hover:bg-[#003359] w-full h-[52px] rounded-lg text-white font-semibold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 text-center space-y-2">
            <span className='text-[#202020]'>Just remember? </span>
            <a href={ROUTES.LOGIN} className='text-[#19ADB8] font-semibold hover:underline'>
              Log In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004072]"></div></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}