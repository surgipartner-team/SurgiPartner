'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Users, Phone, Calendar, Activity } from 'lucide-react';
import RoleLayout from '@/components/layouts/RoleLayout';
import { toast } from 'react-toastify';

export default function CareBuddyDashboard() {
    const [data, setData] = useState({
        activePatients: 0,
        callsToday: 0,
        followUpsDue: 0,
        totalActivities: 0
    });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Get session
            const sessionRes = await axios.get(API_ENDPOINTS.AUTH.SESSION);
            setUser(sessionRes.data.user);

            // Get pipeline cases for active patients
            const response = await axios.get('/api/v1/pipeline');
            const cases = response.data.cases || [];

            // Count active patients (post-operative care - surgery done, discharge, followup stages)
            const activePatients = cases.filter(c =>
                ['surgery_done', 'discharge', 'followup'].includes(c.status)
            ).length;

            // Follow-ups due this week
            const followUpsDue = cases.filter(c => c.status === 'followup').length;

            setData({
                activePatients,
                callsToday: 0,
                followUpsDue,
                totalActivities: cases.length
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Error loading dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <RoleLayout allowedRole="carebuddy">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin"></div>
                </div>
            </RoleLayout>
        );
    }

    return (
        <RoleLayout allowedRole="carebuddy">
            <div className="p-6 min-h-screen bg-gray-50">
                {/* Welcome Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {user?.username || 'Care Buddy'}
                    </h1>
                    <p className="text-gray-500">Here&apos;s your performance overview for today</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Active Patients - Pink */}
                    <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <p className="text-white/80 text-sm mb-1 mt-6">Active Patients</p>
                        <p className="text-3xl font-bold">{data.activePatients}</p>
                        <p className="text-white/60 text-sm mt-1">Post-operative care</p>
                    </div>

                    {/* Calls Today - Purple */}
                    <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Phone size={20} />
                        </div>
                        <p className="text-white/80 text-sm mb-1 mt-6">Calls Today</p>
                        <p className="text-3xl font-bold">{data.callsToday}</p>
                        <p className="text-white/60 text-sm mt-1">Follow-up calls made</p>
                    </div>

                    {/* Follow-ups Due - Blue */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Calendar size={20} />
                        </div>
                        <p className="text-white/80 text-sm mb-1 mt-6">Follow-ups Due</p>
                        <p className="text-3xl font-bold">{data.followUpsDue}</p>
                        <p className="text-white/60 text-sm mt-1">This week</p>
                    </div>

                    {/* Total Activities - Teal */}
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                        <p className="text-white/80 text-sm mb-1 mt-6">Total Activities</p>
                        <p className="text-3xl font-bold">{data.totalActivities}</p>
                        <p className="text-white/60 text-sm mt-1">All time</p>
                    </div>
                </div>
            </div>
        </RoleLayout>
    );
}
