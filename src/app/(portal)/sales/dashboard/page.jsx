'use client';

import React, { useState, useEffect } from 'react';
import RoleLayout from '@/components/layouts/RoleLayout';
import {
    Users,
    Phone,
    TrendingUp,
    AlertCircle,
    ArrowRight,
    PhoneCall,
    Calendar,
    Search
} from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SalesDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        leads: [],
        stats: {
            total: 0,
            callsToday: 0,
            conversionRate: 0,
            overdue: 0,
            conversions: 0
        },
        leadDistribution: [],
        weeklyPerformance: [],
        callQueue: []
    });
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_ENDPOINTS.LEADS);
            const leads = response.data.leads || [];

            // --- Process Real Data ---

            // 1. Stats
            const total = leads.length;
            const converted = leads.filter(l => l.status === 'converted').length;
            const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : 0;
            // Mock overdue for now as we don't have a specific due date field in the basic lead object
            const overdue = leads.filter(l => l.status === 'follow-up').length;

            // 2. Lead Distribution (Donut)
            const statusCounts = leads.reduce((acc, curr) => {
                const status = curr.status || 'new';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            const leadDistribution = Object.keys(statusCounts).map(status => ({
                name: status.replace('-', ' '),
                value: statusCounts[status]
            }));

            // 3. Call Queue (New & Follow-up leads)
            const callQueue = leads
                .filter(l => ['new', 'follow-up'].includes(l.status))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);

            const callsToday = 0;
            // Calculate Weekly Performance (Conversions only for now)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const today = new Date();
            const last7Days = [];

            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                last7Days.push({
                    date: d.toISOString().split('T')[0],
                    dayName: days[d.getDay()]
                });
            }

            const weeklyPerformance = last7Days.map(day => {
                const dayConversions = leads.filter(l =>
                    l.status === 'converted' &&
                    (l.updated_at || l.created_at).startsWith(day.date)
                ).length;

                return {
                    day: day.dayName,
                    calls: 0,
                    conversions: dayConversions
                };
            });

            setData({
                leads,
                stats: {
                    total,
                    callsToday,
                    conversionRate,
                    overdue,
                    conversions: converted // Use real total converted count
                },
                leadDistribution,
                weeklyPerformance,
                callQueue
            });
        } catch (error) {
            console.error("Error fetching sales dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <RoleLayout allowedRole="sales">
                <div className="p-6 flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </RoleLayout>
        );
    }

    return (
        <RoleLayout allowedRole="sales">
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, Sales Rep</h1>
                    <p className="text-gray-500 mt-1">Here's your performance overview for today</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="My Leads"
                        value={data.stats.total}
                        subtitle="Active in pipeline"
                        icon={Users}
                        theme="blue"
                    />
                    <StatCard
                        title="Calls Today"
                        value={data.stats.callsToday}
                        subtitle="On your schedule"
                        icon={Phone}
                        theme="teal"
                    />
                    <StatCard
                        title="Conversion Rate"
                        value={`${data.stats.conversionRate}%`}
                        subtitle={`${data.stats.conversions} conversions`}
                        icon={TrendingUp}
                        theme="green"
                    />
                    <StatCard
                        title="Overdue Follow-ups"
                        value={data.stats.overdue}
                        subtitle="Needs attention"
                        icon={AlertCircle}
                        theme="orange"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Lead Distribution */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">My Lead Distribution</h3>
                            <p className="text-sm text-gray-500">Status breakdown</p>
                        </div>
                        <LeadDistributionChart data={data.leadDistribution} />
                    </div>

                    {/* Weekly Performance */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Weekly Performance</h3>
                            <p className="text-sm text-gray-500">Calls & conversions</p>
                        </div>
                        <WeeklyPerformanceChart data={data.weeklyPerformance} />
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">Calls</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">Conversions</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today's Call Queue */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900">Today's Call Queue</h3>
                        <p className="text-sm text-gray-500">{data.callQueue.length} calls scheduled</p>
                    </div>

                    {data.callQueue.length > 0 ? (
                        <div className="space-y-4 mb-6">
                            {data.callQueue.map((lead) => (
                                <div key={lead.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                                            {lead.name?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{lead.name}</p>
                                            <p className="text-xs text-gray-500">{lead.surgery_name || lead.category || 'General'} • {lead.city}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full capitalize">
                                            {lead.status}
                                        </div>
                                        <button
                                            onClick={() => router.push(`/sales/leads?id=${lead.id}`)}
                                            className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 text-sm font-medium px-4"
                                        >
                                            <PhoneCall size={16} /> Call
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p>No calls scheduled for today</p>
                        </div>
                    )}

                    <Link href="/sales/leads" className="block w-full">
                        <button className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                            View All Leads <ArrowRight size={18} />
                        </button>
                    </Link>
                </div>
            </div>
        </RoleLayout>
    );
}

const StatCard = ({ title, value, subtitle, icon: Icon, theme }) => {
    const themes = {
        blue: "bg-blue-500 text-white",
        teal: "bg-teal-500 text-white",
        green: "bg-green-500 text-white",
        orange: "bg-orange-500 text-white"
    };

    const iconThemes = {
        blue: "bg-white/20",
        teal: "bg-white/20",
        green: "bg-white/20",
        orange: "bg-white/20"
    };

    return (
        <div className={`rounded-2xl p-6 ${themes[theme] || themes.blue} shadow-sm`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconThemes[theme]}`}>
                <Icon size={24} className="text-white" />
            </div>
            <p className="text-white/80 text-sm mb-1">{title}</p>
            <h3 className="text-3xl font-bold mb-1">{value}</h3>
            <p className="text-white/60 text-xs">{subtitle}</p>
        </div>
    );
};

const LeadDistributionChart = ({ data }) => {
    const [hover, setHover] = useState(null);
    const size = 200;
    const center = size / 2;
    const radius = 80;
    const strokeWidth = 25;

    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400">No data</div>;
    }

    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    // Google-ish colors
    const colors = [
        '#4285F4', // Blue
        '#FBBC05', // Yellow
        '#34A853', // Green
        '#EA4335', // Red
        '#AA00FF', // Purple
    ];

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    <circle cx={center} cy={center} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />

                    {data.map((item, index) => {
                        const pct = (item.value / total);
                        const dashArray = `${pct * circumference} ${circumference}`;
                        const offset = currentOffset;
                        currentOffset -= pct * circumference;
                        const color = colors[index % colors.length];

                        return (
                            <circle
                                key={index}
                                cx={center} cy={center} r={radius}
                                fill="none" stroke={color} strokeWidth={strokeWidth}
                                strokeDasharray={dashArray}
                                strokeDashoffset={offset}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onMouseEnter={() => setHover({ ...item, color })}
                                onMouseLeave={() => setHover(null)}
                            />
                        );
                    })}
                </svg>

                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-24">
                    {hover ? (
                        <>
                            <span className="text-2xl font-bold text-gray-800 block leading-none">{hover.value}</span>
                            <p className="text-xs text-gray-500 truncate mt-1 capitalize">{hover.name}</p>
                        </>
                    ) : (
                        <>
                            <span className="text-2xl font-bold text-gray-800 block leading-none">{total}</span>
                            <p className="text-xs text-gray-500 mt-1">Total</p>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-6 w-full max-w-xs">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <span className="text-gray-600 capitalize truncate flex-1">{item.name}</span>
                        <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WeeklyPerformanceChart = ({ data }) => {
    const [hover, setHover] = useState(null);
    if (!data || data.length === 0) return <div className="text-center text-gray-400 py-10">No performance data</div>;

    const maxVal = Math.max(...data.map(d => Math.max(d.calls, d.conversions)), 1);

    return (
        <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[1, 0.75, 0.5, 0.25, 0].map(p => (
                    <div key={p} className="w-full border-t border-gray-100 h-0 relative">
                        <span className="absolute -left-6 -top-2 text-xs text-gray-400">{Math.round(maxVal * p)}</span>
                    </div>
                ))}
            </div>

            {data.map((item, i) => {
                const callsHeight = (item.calls / maxVal) * 100;
                const convHeight = (item.conversions / maxVal) * 100;

                return (
                    <div
                        key={i}
                        className="relative flex-1 flex flex-col justify-end items-center group h-full z-10 cursor-pointer"
                        onMouseEnter={() => setHover(item)}
                        onMouseLeave={() => setHover(null)}
                    >
                        {/* Tooltip */}
                        {hover === item && (
                            <div className="absolute bottom-full mb-2 bg-white shadow-xl border border-gray-100 p-2 rounded-lg z-20 w-32 text-center pointer-events-none">
                                <p className="font-semibold text-gray-800 mb-1">{item.day}</p>
                                <div className="text-xs space-y-1">
                                    <p className="text-blue-600">Calls: {item.calls}</p>
                                    <p className="text-green-600">Conversions: {item.conversions}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-1 items-end w-full justify-center px-1">
                            {/* Calls Bar */}
                            <div
                                className="w-1/2 bg-blue-500 rounded-t-sm hover:opacity-80 transition-all duration-300"
                                style={{ height: `${callsHeight}%` }}
                            ></div>
                            {/* Conversions Bar */}
                            <div
                                className="w-1/2 bg-green-500 rounded-t-sm hover:opacity-80 transition-all duration-300"
                                style={{ height: `${convHeight}%` }}
                            ></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2">{item.day}</span>
                    </div>
                );
            })}
        </div>
    );
};