'use client';

import React, { useState, useEffect } from 'react';
import RoleLayout from '@/components/layouts/RoleLayout';
import {
    Activity,
    Calendar,
    CheckCircle2,
    Clock,
    TrendingUp,
    AlertTriangle,
    Building2,
    ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import Link from 'next/link';

export default function OpsDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        cases: [],
        stats: {
            total: 0,
            active: 0,
            consultations: 0,
            scheduled: 0,
            completed: 0
        },
        pipelineStats: [],
        hospitalStats: [],
        upcomingSurgeries: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_ENDPOINTS.PIPELINE);
            const cases = response.data.cases || [];

            // Process Stats
            const stats = {
                total: cases.length,
                active: cases.filter(c => !['completed', 'cancelled'].includes(c.status)).length,
                consultations: cases.filter(c => ['consultation_scheduled', 'consultation_done'].includes(c.status)).length,
                scheduled: cases.filter(c => ['ot_scheduled', 'admission'].includes(c.status)).length,
                completed: cases.filter(c => ['surgery_done', 'discharge', 'completed'].includes(c.status)).length
            };

            // Process Pipeline Distribution (Donut)
            const stageCounts = cases.reduce((acc, curr) => {
                const stage = curr.status || 'Unknown';
                acc[stage] = (acc[stage] || 0) + 1;
                return acc;
            }, {});
            const pipelineStats = Object.keys(stageCounts).map(stage => ({
                name: stage.replace(/_/g, ' '),
                value: stageCounts[stage]
            }));

            // Process Hospital Distribution (Bar)
            const hospitalCounts = cases.reduce((acc, curr) => {
                const hospital = curr.hospital_name || 'Unknown';
                acc[hospital] = (acc[hospital] || 0) + 1;
                return acc;
            }, {});
            const hospitalStats = Object.keys(hospitalCounts)
                .map(hospital => ({
                    name: hospital,
                    count: hospitalCounts[hospital]
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5); // Top 5

            // Upcoming Surgeries
            const upcomingSurgeries = cases
                .filter(c => c.surgery_date && new Date(c.surgery_date) >= new Date())
                .sort((a, b) => new Date(a.surgery_date) - new Date(b.surgery_date))
                .slice(0, 3);

            setData({
                cases,
                stats,
                pipelineStats,
                hospitalStats,
                upcomingSurgeries
            });
        } catch (error) {
            console.error("Error fetching ops dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <RoleLayout allowedRole="ops">
                <div className="p-6 flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </RoleLayout>
        );
    }

    return (
        <RoleLayout allowedRole="ops">
            <div className="p-6 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, Ops Manager</h1>
                    <p className="text-gray-500 mt-1">Here's your performance overview for today</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Cases"
                        value={data.stats.active}
                        subtitle="Active in pipeline"
                        icon={Activity}
                        theme="purple"
                    />
                    <StatCard
                        title="Consultations"
                        value={data.stats.consultations}
                        subtitle="Scheduled"
                        icon={Calendar}
                        theme="blue"
                    />
                    <StatCard
                        title="OT Scheduled"
                        value={data.stats.scheduled}
                        subtitle="Ready for surgery"
                        icon={CheckCircle2}
                        theme="teal"
                    />
                    <StatCard
                        title="Completed"
                        value={data.stats.completed}
                        subtitle="Surgeries done"
                        icon={TrendingUp}
                        theme="green"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Pipeline Distribution */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Pipeline Distribution</h3>
                            <p className="text-sm text-gray-500">Cases by stage</p>
                        </div>
                        <PipelineDonutChart data={data.pipelineStats} />
                    </div>

                    {/* Hospital Distribution */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Hospital Distribution</h3>
                            <p className="text-sm text-gray-500">Cases by facility</p>
                        </div>
                        <HospitalDistributionChart data={data.hospitalStats} />
                    </div>
                </div>

                {/* Upcoming Surgeries */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900">Upcoming Surgeries</h3>
                        <p className="text-sm text-gray-500">Next scheduled procedures</p>
                    </div>

                    {data.upcomingSurgeries.length > 0 ? (
                        <div className="space-y-4 mb-6">
                            {data.upcomingSurgeries.map((surgery) => (
                                <div key={surgery.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                                            {surgery.first_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                                                {surgery.first_name} {surgery.last_name}
                                            </p>
                                            <p className="text-sm text-gray-500">{surgery.surgery_type || 'Surgery'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                            {new Date(surgery.surgery_date).toLocaleDateString()}
                                        </p>
                                        <p className="text-sm text-gray-500">{surgery.hospital_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p>No upcoming surgeries scheduled</p>
                        </div>
                    )}

                    <Link href="/ops/pipeline" className="block w-full">
                        <button className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                            Open Pipeline Board <ArrowRight size={18} />
                        </button>
                    </Link>
                </div>
            </div>
        </RoleLayout>
    );
}

const StatCard = ({ title, value, subtitle, icon: Icon, theme }) => {
    const themes = {
        purple: "bg-purple-600 text-white",
        blue: "bg-blue-500 text-white",
        teal: "bg-teal-500 text-white",
        green: "bg-green-500 text-white"
    };

    const iconThemes = {
        purple: "bg-white/20",
        blue: "bg-white/20",
        teal: "bg-white/20",
        green: "bg-white/20"
    };

    return (
        <div className={`rounded-2xl p-6 ${themes[theme] || themes.purple} shadow-sm`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconThemes[theme]}`}>
                <Icon size={24} className="text-white" />
            </div>
            <p className="text-white/80 text-sm mb-1">{title}</p>
            <h3 className="text-3xl font-bold mb-1">{value}</h3>
            <p className="text-white/60 text-xs">{subtitle}</p>
        </div>
    );
};

const PipelineDonutChart = ({ data }) => {
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

    // Vibrant colors for pipeline stages
    const distinctColors = [
        '#3b82f6', // blue-500
        '#8b5cf6', // violet-500
        '#10b981', // emerald-500
        '#f59e0b', // amber-500
        '#06b6d4', // cyan-500
        '#ec4899', // pink-500
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
                        const color = distinctColors[index % distinctColors.length];

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

                {/* Center Text */}
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

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-6 w-full max-w-xs">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: distinctColors[index % distinctColors.length] }}
                        ></div>
                        <span className="text-gray-600 capitalize truncate flex-1" title={item.name}>{item.name}</span>
                        <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HospitalDistributionChart = ({ data }) => {
    const [hover, setHover] = useState(null);

    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                    <Building2 className="mx-auto mb-2 text-gray-300" size={40} />
                    <p>No hospital data available</p>
                </div>
            </div>
        );
    }

    const maxCount = Math.max(...data.map(h => h.count), 1);

    return (
        <div className="h-64 flex flex-col justify-center space-y-4">
            {data.map((hospital, i) => {
                const percentage = (hospital.count / maxCount) * 100;
                return (
                    <div
                        key={i}
                        className="relative flex items-center gap-4 group cursor-pointer"
                        onMouseEnter={() => setHover(hospital)}
                        onMouseLeave={() => setHover(null)}
                    >
                        <div className="w-32 text-sm text-gray-600 truncate group-hover:text-blue-600 transition-colors text-right">
                            {hospital.name}
                        </div>
                        <div className="flex-1 h-8 bg-gray-50 rounded-lg overflow-hidden relative">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg transition-all duration-300 group-hover:from-cyan-500 group-hover:to-blue-600"
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                        <div className="w-8 text-sm font-medium text-gray-900">
                            {hospital.count}
                        </div>

                        {/* Tooltip */}
                        {hover === hospital && (
                            <div className="absolute left-1/2 bottom-full mb-2 bg-white shadow-xl border border-gray-100 p-2 rounded-lg z-20 w-48 text-center pointer-events-none transform -translate-x-1/2">
                                <p className="font-semibold text-gray-800 mb-1 truncate">{hospital.name}</p>
                                <p className="text-sm font-bold text-blue-600">
                                    Cases: {hospital.count}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
