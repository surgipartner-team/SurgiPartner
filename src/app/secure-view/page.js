'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Eye, EyeOff, Copy, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

function SecureViewContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);

    const verifyToken = useCallback(async () => {
        try {
            const response = await axios.post('/api/v1/secure-view/verify', { token });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load secure data");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            setError("Invalid Link");
            setLoading(false);
            return;
        }

        verifyToken();
    }, [token, verifyToken]);

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied!`);
    };

    const formatTime = (seconds) => {
        if (!seconds) return "0s";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#004071] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} className="text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <p className="text-sm text-gray-500">
                    If you need access, please ask your administrator to generate a new link.
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#004071] flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-[#19ADB8] p-6 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-2xl font-bold text-white mb-1">Login Credentials</h1>
                        <p className="text-white/90 text-sm">For {data.patientName}</p>
                    </div>
                </div>

                <div className="p-8">
                    {/* Timer Alert */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8 flex items-center gap-3">
                        <Clock className="text-orange-600 shrink-0" size={20} />
                        <div>
                            <p className="text-sm font-semibold text-orange-900">This link expires in {formatTime(timeLeft)}</p>
                            <p className="text-xs text-orange-700">Please save your credentials immediately.</p>
                            <p className="text-xs text-red-600 font-bold mt-1">Login credentials are confidential don&apos;t share to anyone</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Login Email */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Login Email</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-mono font-medium truncate">
                                    {data.email}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(data.email, 'Email')}
                                    className="p-3 text-gray-500 hover:text-[#004071] hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-mono font-medium flex justify-between items-center">
                                    <span>{showPassword ? data.password : '••••••••'}</span>
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(data.password, 'Password')}
                                    className="p-3 text-gray-500 hover:text-[#004071] hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <a
                            href="/login"
                            className="inline-block w-full py-3 px-4 bg-[#004071] text-white font-bold rounded-xl hover:bg-[#003055] transition-colors mb-4"
                        >
                            Go to Login Page
                        </a>
                        <p className="text-xs text-gray-500">
                            SurgiPartner Portal Access
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SecureViewPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#004071] border-t-transparent rounded-full animate-spin"></div></div>}>
            <SecureViewContent />
        </Suspense>
    );
}
