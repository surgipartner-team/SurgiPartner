'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { API_ENDPOINTS, ROUTES } from '@/lib/constants';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email,
      });

      setSuccess(true);
      setEmail('');
    } catch (err) {
      console.error('Forgot password error:', err);
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to process request. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

          <div className='lg:mb-6'>
            <h1 className='text-[#202020] text-[32px] font-semibold mb-2'>Forgot password?</h1>
            <p className="text-[#5A5A5A]">
              No worries! Just enter your email and we&apos; ll send <br />you a reset password link.
            </p>
          </div>


          {/* Success Message */}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <strong className="font-semibold">Email Sent!</strong>
                  <p className="text-sm mt-1">
                    If an account exists with this email, you&apos;ll receive password reset instructions shortly.
                  </p>
                </div>
              </div>
            </div>
          )}

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
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
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
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                'Send Recovery Email'
              )}
            </button>
          </form>

          {/* Footer Links */}
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