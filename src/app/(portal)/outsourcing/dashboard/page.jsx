'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Users, Clock, TrendingUp, CheckCircle, Plus, Phone, ArrowRight } from 'lucide-react';
import RoleLayout from '@/components/layouts/RoleLayout';

export default function OutsourcingDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ total: 0, today: 0, thisMonth: 0, converted: 0, new: 0, followup: 0 });
    const [recentLeads, setRecentLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch user session
            const sessionRes = await axios.get(API_ENDPOINTS.AUTH.SESSION);
            if (sessionRes.data.user) {
                setUser(sessionRes.data.user);
            }

            // Fetch leads for this user
            const leadsRes = await axios.get(API_ENDPOINTS.LEADS);
            const leads = leadsRes.data.leads || [];

            // Calculate stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const todayLeads = leads.filter(l => new Date(l.created_at) >= today).length;
            const monthLeads = leads.filter(l => new Date(l.created_at) >= startOfMonth).length;
            const converted = leads.filter(l => l.status === 'converted').length;
            const newLeads = leads.filter(l => l.status === 'new').length;
            const followup = leads.filter(l => l.status === 'follow-up').length;

            setStats({
                total: leads.length,
                today: todayLeads,
                thisMonth: monthLeads,
                converted,
                new: newLeads,
                followup
            });

            // Get recent 5 leads
            setRecentLeads(leads.slice(0, 5));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const conversionRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) : 0;

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getStatusColor = (status) => {
        const colors = {
            'new': 'bg-blue-100 text-blue-700',
            'follow-up': 'bg-amber-100 text-amber-700',
            'converted': 'bg-green-100 text-green-700',
            'not-converted': 'bg-gray-100 text-gray-600',
            'dummy': 'bg-red-100 text-red-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-600';
    };

    const StatCard = ({ icon: Icon, label, value, iconBg }) => (
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
                <Icon className="text-white" size={22} />
            </div>
            <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );

    if (loading) {
        return (
            <RoleLayout allowedRole="outsourcing">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin"></div>
                </div>
            </RoleLayout>
        );
    }

    return (
        <RoleLayout allowedRole="outsourcing">
            <div className="p-6 min-h-screen bg-gray-50">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.username || 'Outsourcing Agent'}!</h1>
                    <p className="text-gray-500">Track your lead generation performance</p>
                </div>

                {/* Add Lead CTA */}
                <div className="bg-gradient-to-r from-[#e8f7f8] to-[#d0f0f3] rounded-2xl p-6 mb-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-lg font-semibold text-gray-800 mb-1">Ready to add more leads?</h2>
                        <p className="text-gray-600 text-sm mb-4">Add new leads and grow your conversion rate</p>
                        <button
                            onClick={() => router.push('/outsourcing/leads')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium transition-colors"
                        >
                            <Plus size={18} />
                            Add New Lead
                        </button>
                    </div>
                    {/* Decorative circle */}
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#19ADB8]/20 rounded-full"></div>
                    <div className="absolute right-8 top-8 w-24 h-24 border-4 border-[#19ADB8]/40 rounded-full flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-[#19ADB8]/60 rounded-full flex items-center justify-center">
                            <div className="w-4 h-4 bg-[#19ADB8] rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard icon={Users} label="Total Leads" value={stats.total} iconBg="bg-blue-500" />
                    <StatCard icon={Clock} label="Today" value={stats.today} iconBg="bg-cyan-500" />
                    <StatCard icon={TrendingUp} label="This Month" value={stats.thisMonth} iconBg="bg-green-500" />
                    <StatCard icon={CheckCircle} label="Converted" value={stats.converted} iconBg="bg-teal-500" />
                </div>

                {/* Performance Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Conversion Rate */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Conversion Rate</h3>
                            <span className="px-3 py-1 bg-[#19ADB8]/10 text-[#19ADB8] text-xs font-medium rounded-full">Performance</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-gray-900">{conversionRate}%</span>
                            <TrendingUp className="text-green-500 mb-2" size={24} />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {stats.converted} out of {stats.total} leads converted
                        </p>
                    </div>

                    {/* Lead Status */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Lead Status</h3>
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Overview</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">New Leads</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${stats.total > 0 ? (stats.new / stats.total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 w-6 text-right">{stats.new}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Follow-up</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full"
                                            style={{ width: `${stats.total > 0 ? (stats.followup / stats.total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 w-6 text-right">{stats.followup}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Converted</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${stats.total > 0 ? (stats.converted / stats.total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 w-6 text-right">{stats.converted}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Leads */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Recent Leads</h3>
                        <button
                            onClick={() => router.push('/outsourcing/leads')}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            View All
                        </button>
                    </div>

                    {recentLeads.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="mx-auto text-gray-300 mb-3" size={40} />
                            <p className="text-gray-500">No leads yet. Add your first lead!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentLeads.map((lead) => (
                                <div key={lead.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-full bg-[#19ADB8]/10 flex items-center justify-center">
                                            <span className="text-sm font-semibold text-[#19ADB8]">
                                                {getInitials(lead.name)}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{lead.name}</p>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Phone size={12} />
                                                {lead.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                                        {lead.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </RoleLayout>
    );
}
