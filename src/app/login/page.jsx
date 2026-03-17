'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS, ROUTES, ROLE_ROUTES } from '@/lib/constants';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorToken: ''
  });
  const [csrfToken, setCsrfToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.AUTH.SESSION);
        if (response.data.valid && response.data.user?.role) {
          const redirectPath = ROLE_ROUTES[response.data.user.role] || ROUTES.HOME;
          router.replace(redirectPath);
          return;
        }
      } catch (error) {
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  // Fetch CSRF token on component mount
  useEffect(() => {
    if (!checkingSession) {
      const fetchCSRFToken = async () => {
        try {
          const response = await axios.get(API_ENDPOINTS.AUTH.LOGIN);
          setCsrfToken(response.data.csrfToken);
        } catch (error) {
          console.error('Failed to fetch CSRF token:', error);
        }
      };
      fetchCSRFToken();
    }
  }, [checkingSession]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (requires2FA && !formData.twoFactorToken)
      newErrors.twoFactorToken = '2FA code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;
    if (!csrfToken) {
      setServerError('Security token missing. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: formData.email,
        password: formData.password,
        twoFactorToken: requires2FA ? formData.twoFactorToken : null,
        csrfToken
      });

      if (response.data.success) {
        if (response.data.csrfToken) setCsrfToken(response.data.csrfToken);

        const redirectPath = ROLE_ROUTES[response.data.user.role] || ROUTES.HOME;
        router.replace(redirectPath);
        router.refresh();
      }
    } catch (error) {
      const errorData = error.response?.data;

      if (errorData?.requires2FA) {
        setRequires2FA(true);
        setServerError('Please enter your two-factor authentication code.');
      } else {
        const errorMessage = errorData?.error || 'Login failed. Please try again.';
        setServerError(errorMessage);
      }

      if (error.response?.status === 429) {
        const remaining = error.response.headers['x-ratelimit-remaining'];
        if (remaining === '0') {
          setServerError(
            (errorData?.error || 'Too many attempts.') + ' Please wait before trying again.'
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };




  if (checkingSession) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#19ADB8]"></div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex flex-col bg-white lg:flex-row'>
      <div className="relative bg-[url('/leftcover.svg')] bg-no-repeat bg-blend-multiply bg-[#19ADB8]/90 bg-blend-darken bg-cover bg-center h-48 lg:h-auto lg:min-h-screen w-full lg:w-[30%] flex items-center justify-center animate-fade-in-left delay-400">
        <div className="absolute top-10 left-6">
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

      <div className='flex flex-col justify-center items-center w-full lg:w-[70%] bg-white relative flex-1'>
        <div className='md:w-full w-70 max-w-[420px] px-8 absolute top-15 lg:top-50'>
          <div className='lg:mb-5'>
            <h1 className='text-[#202020] text-[32px] font-semibold'>
              Log in
            </h1>
          </div>

          <div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {serverError && (
                <div
                  className={`border px-4 py-3 rounded-lg ${requires2FA
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                >
                  {serverError}
                </div>
              )}

              {!requires2FA ? (
                <>
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email address"
                      required
                      autoComplete="email"
                      className='border-[#DCDCDC] border rounded-lg w-full h-[52px] px-4 text-[15px] placeholder-[#898989] focus:outline-none focus:border-[#19ADB8] focus:ring-1 focus:ring-[#19ADB8] transition-colors'
                    />
                    {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email}</p>}
                  </div>

                  <div className='relative'>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Password"
                      required
                      autoComplete="current-password"
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
                    {errors.password && <p className='text-red-500 text-sm mt-1'>{errors.password}</p>}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Two-Factor Authentication</strong><br />
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  <input
                    type="text"
                    name="twoFactorToken"
                    value={formData.twoFactorToken}
                    onChange={handleChange}
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    className="text-center text-2xl tracking-widest border-[#DCDCDC] border rounded-lg w-full h-[52px] px-4"
                  />
                  {errors.twoFactorToken && <p className='text-red-500 text-sm mt-1'>{errors.twoFactorToken}</p>}

                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setFormData(prev => ({ ...prev, twoFactorToken: '' }));
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    ← Back to login
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !csrfToken}
                className='bg-[#004071] hover:bg-[#003359] w-full h-[52px] rounded-lg text-white font-semibold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {!csrfToken ? 'Loading...' : requires2FA ? 'Verify Code' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}