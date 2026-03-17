'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { User, Calendar, Activity, FileText, Star, LogOut, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import PatientReviewPage from '@/components/pages/PatientReviewPage';

export default function PatientDashboard() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReviewModal, setShowReviewModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/api/v1/patient/dashboard');
                setData(response.data);
            } catch (error) {
                console.error("Dashboard Error:", error);
                if (error.response?.status === 403) {
                    toast.error("Access Denied");
                    router.push('/login');
                } else {
                    toast.error("Failed to load dashboard");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
            router.push('/login');
        } catch (error) {
            router.push('/login');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!data) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Patient Record Found</h1>
            <p className="text-gray-600 mb-6">We couldn&apos;t find your patient record. Please contact support.</p>
            <button onClick={handleLogout} className="px-6 py-2 bg-[#004071] text-white rounded-xl">Logout</button>
        </div>
    );

    const { patient, surgeries, carebuddy } = data;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Navbar */}
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#004071] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                                S
                            </div>
                            <span className="text-xl font-bold text-[#004071]">SurgiPartner</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-700 hidden sm:block">Welcome, {patient.first_name}</span>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome & Review Banner */}
                <div className="bg-gradient-to-r from-[#004071] to-[#19ADB8] rounded-2xl shadow-lg p-8 mb-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-2">Hello, {patient.first_name} 👋</h1>
                        <p className="opacity-90 max-w-2xl mb-6">
                            Track your recovery journey, managing your surgeries, and connect with your care team all in one place.
                        </p>
                        {data.has_reviewed ? (
                            <button
                                disabled
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold cursor-not-allowed"
                            >
                                <CheckCircle size={20} className="text-green-500" />
                                Review Submitted
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowReviewModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#004071] rounded-xl font-bold shadow-md hover:bg-gray-100 transition-transform hover:scale-105"
                            >
                                <Star size={20} className="fill-[#004071]" />
                                Write a Review
                            </button>
                        )}
                    </div>
                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile & Carebuddy */}
                    <div className="space-y-8">
                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <User size={20} className="text-[#19ADB8]" />
                                Patient Profile
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Full Name</span>
                                    <span className="font-medium text-gray-900">{patient.first_name} {patient.last_name}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Phone</span>
                                    <span className="font-medium text-gray-900">{patient.phone}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Email</span>
                                    <span className="font-medium text-gray-900 truncate max-w-[200px]">{patient.email || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-gray-500">Age / Gender</span>
                                    <span className="font-medium text-gray-900">{patient.age} / {patient.gender}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Blood Group</span>
                                    <span className="font-medium text-gray-900">{patient.blood_group || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Carebuddy Card */}
                        {carebuddy ? (
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Activity size={20} className="text-emerald-500" />
                                    Your Care Buddy
                                </h2>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg">
                                        {carebuddy.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{carebuddy.username}</p>
                                        <p className="text-sm text-gray-500">Assigned Care Buddy</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Phone size={16} />
                                        <span>{carebuddy.mobile || 'No contact info'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Mail size={16} />
                                        <span>{carebuddy.email || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 text-center">
                                <p className="text-gray-500 italic">No Care Buddy assigned yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Surgeries & Timeline */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Surgeries List */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Calendar size={20} className="text-[#004071]" />
                                Surgery History
                            </h2>

                            {surgeries.length === 0 ? (
                                <p className="text-gray-500">No surgeries recorded.</p>
                            ) : (
                                <div className="space-y-6">
                                    {surgeries.map((surgery) => (
                                        <div key={surgery.id} className="border border-gray-200 rounded-xl p-5 hover:border-[#19ADB8] transition-colors relative">
                                            {/* Status Badge */}
                                            <div className="absolute top-5 right-5">
                                                <span className="px-3 py-1 bg-blue-50 text-[#004071] text-xs font-bold uppercase tracking-wide rounded-full">
                                                    {surgery.status.replace('_', ' ')}
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{surgery.surgery_type}</h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div className="flex items-start gap-3">
                                                    <Calendar size={18} className="text-gray-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Surgery Date</p>
                                                        <p className="text-gray-900 font-medium">
                                                            {surgery.surgery_date ? new Date(surgery.surgery_date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'Scheduled Soon'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <MapPin size={18} className="text-gray-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Hospital</p>
                                                        <p className="text-gray-900 font-medium">{surgery.hospital_name || 'Not assigned'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <User size={18} className="text-gray-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Surgeon</p>
                                                        <p className="text-gray-900 font-medium">{surgery.surgeon_name ? `Dr. ${surgery.surgeon_name}` : 'Not assigned'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <FileText size={18} className="text-gray-400 mt-1" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Notes</p>
                                                        <p className="text-gray-900 text-sm">{surgery.surgery_notes || 'No notes available'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {showReviewModal && (
                <PatientReviewPage
                    patientId={patient.id}
                    surgeries={surgeries}
                    carebuddy={carebuddy}
                    onClose={() => setShowReviewModal(false)}
                />
            )}
        </div>
    );
}
