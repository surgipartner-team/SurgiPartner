'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import {
    TrendingUp, Clock, AlertTriangle, DollarSign, ArrowUpRight, ArrowDownRight,
    Download, Building2, CreditCard, User
} from 'lucide-react';
import RoleLayout from '@/components/layouts/RoleLayout';
import { toast } from 'react-toastify';

export default function AccountantDashboard() {
    const [data, setData] = useState({
        cases: [],
        stats: {},
        statusBreakdown: {},
        paymentModes: [],
        monthlyTrend: [],
        hospitalOutstanding: []
    });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [financeRes, sessionRes] = await Promise.all([
                axios.get('/api/v1/finance?period=this_month'),
                axios.get(API_ENDPOINTS.AUTH.SESSION)
            ]);

            // Fetch hospital outstanding data
            let hospitalOutstanding = [];
            try {
                const hospitalRes = await axios.get('/api/v1/finance/hospital-outstanding');
                hospitalOutstanding = hospitalRes.data.hospitals || [];
            } catch (e) {
                // API may not exist yet, use mock data for now
                hospitalOutstanding = [];
            }

            setData({
                ...financeRes.data,
                hospitalOutstanding
            });
            setUser(sessionRes.data.user);
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



    const getPaymentStatusColor = (status) => {
        const colors = {
            paid: 'bg-green-100 text-green-700',
            partial: 'bg-amber-100 text-amber-700',
            pending: 'bg-red-100 text-red-700',
            overdue: 'bg-red-100 text-red-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    // Calculate chart data
    const maxRevenue = Math.max(...data.monthlyTrend.map(m => parseFloat(m.revenue) || 0), 1);

    // Pending collections (partial or pending status)
    const pendingCollections = data.cases?.filter(c =>
        c.payment_status === 'partial' || c.payment_status === 'pending'
    ).slice(0, 5) || [];

    if (loading) {
        return (
            <RoleLayout allowedRole="accountant">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin"></div>
                </div>
            </RoleLayout>
        );
    }

    return (
        <RoleLayout allowedRole="accountant">
            <div className="p-6 min-h-screen bg-gray-50">
                {/* Welcome Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {user?.username || 'Accountant'}
                    </h1>
                    <p className="text-gray-500">Here's your performance overview for today</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Total Collected - Blue */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                        <div className="absolute top-4 right-16 px-2 py-0.5 bg-white/20 rounded text-xs flex items-center gap-1">
                            <ArrowUpRight size={12} /> 15.2%
                        </div>
                        <p className="text-white/80 text-sm mb-1 mt-6">Total Collected</p>
                        <p className="text-3xl font-bold">{formatCurrency(data.stats.total_collected)}</p>
                        <p className="text-white/60 text-sm mt-1">This month</p>
                    </div>

                    {/* Outstanding - Orange */}
                    <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                        <div className="absolute top-4 right-16 px-2 py-0.5 bg-white/20 rounded text-xs flex items-center gap-1">
                            <ArrowDownRight size={12} /> 5.8%
                        </div>
                        <p className="text-white/80 text-sm mb-1 mt-6">Outstanding</p>
                        <p className="text-3xl font-bold">{formatCurrency(data.stats.total_pending)}</p>
                        <p className="text-white/60 text-sm mt-1">Across {data.stats.case_count || 0} cases</p>
                    </div>

                    {/* Collection Rate - Green */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <span className="absolute top-4 right-16 px-2 py-0.5 bg-white/20 rounded text-xs">
                            {parseFloat(data.stats.collection_rate) >= 50 ? 'Good' : 'Low'}
                        </span>
                        <p className="text-white/80 text-sm mb-1 mt-6">Collection Rate</p>
                        <p className="text-3xl font-bold">{data.stats.collection_rate || 0}%</p>
                        <p className="text-white/60 text-sm mt-1">Industry avg: 75%</p>
                    </div>

                    {/* Overdue - Red */}
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="absolute top-4 right-16 px-2 py-0.5 bg-white/20 rounded text-xs">Urgent</span>
                        <p className="text-white/80 text-sm mb-1 mt-6">Overdue</p>
                        <p className="text-3xl font-bold">{formatCurrency(data.stats.overdue)}</p>
                        <p className="text-white/60 text-sm mt-1">Needs follow-up</p>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Revenue & Collection Trend */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Revenue & Collection Trend</h3>
                            <p className="text-sm text-gray-500">Monthly billed vs collected</p>
                        </div>
                        {data.monthlyTrend.length > 0 && maxRevenue > 1 ? (
                            <RevenueChart data={data.monthlyTrend} maxRevenue={maxRevenue} />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                <div className="text-center">
                                    <TrendingUp className="mx-auto mb-2 text-gray-300" size={40} />
                                    <p>No trend data available</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">Revenue</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-[#19ADB8] rounded-full"></div>
                                <span className="text-sm text-gray-600">Collected</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status Donut */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Payment Status</h3>
                            <p className="text-sm text-gray-500">Cases breakdown</p>
                        </div>

                        {/* Donut Chart */}
                        <div className="flex justify-center mb-6">
                            <div className="scale-90 origin-center">
                                <DonutChart data={data.statusBreakdown} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Paid</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{data.statusBreakdown.paid || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Partial</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{data.statusBreakdown.partial || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Pending</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{data.statusBreakdown.pending || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Second Row - Outstanding by Hospital & Payment Methods */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Outstanding by Hospital */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Outstanding by Hospital</h3>
                            <p className="text-sm text-gray-500">AR aging analysis</p>
                        </div>
                        <HospitalOutstandingChart data={data.hospitalOutstanding} />
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Payment Methods</h3>
                            <p className="text-sm text-gray-500">Distribution by type</p>
                        </div>
                        <PaymentModeChart data={data.paymentModes} />
                    </div>
                </div>

                {/* Pending Collections */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-gray-900">Pending Collections</h3>
                            <p className="text-sm text-gray-500">Cases requiring payment follow-up</p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <DollarSign size={16} /> Export Report
                        </button>
                    </div>

                    {pendingCollections.length > 0 ? (
                        <div className="space-y-3">
                            {pendingCollections.map((item, i) => {
                                const paidPercentage = parseFloat(item.total_amount) > 0
                                    ? ((parseFloat(item.paid_amount) / parseFloat(item.total_amount)) * 100).toFixed(0)
                                    : 0;
                                return (
                                    <div key={item.case_id || i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                                <DollarSign size={20} className="text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{item.patient_name}</p>
                                                <p className="text-sm text-gray-500">{item.surgery_type || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900">{formatCurrency(item.outstanding)}</p>
                                                <p className="text-sm text-gray-500">{paidPercentage}% paid</p>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${getPaymentStatusColor(item.payment_status)}`}>
                                                {item.payment_status === 'pending' ? 'Unpaid' : item.payment_status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            <div className="text-center">
                                <User className="mx-auto mb-2 text-gray-300" size={40} />
                                <p>No pending collections</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </RoleLayout>
    );

}

// Helper for formatting currency
const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    if (num >= 100000) {
        return '₹' + (num / 100000).toFixed(1) + 'L';
    }
    return '₹' + num.toLocaleString('en-IN');
};

// Helper for formatting large numbers
const formatLargeNumber = (num) => {
    if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
    return (num / 1000).toFixed(1) + 'k';
};

const RevenueChart = ({ data, maxRevenue }) => {
    const [hoverStats, setHoverStats] = useState(null);
    const width = 400;
    const height = 200;
    const graphHeight = 180;

    const getCoord = (index, value) => {
        const x = (index / (data.length - 1 || 1)) * width;
        const y = height - (parseFloat(value) / maxRevenue) * graphHeight;
        return { x, y };
    };

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const index = Math.round((mouseX / rect.width) * (data.length - 1));

        if (index >= 0 && index < data.length) {
            setHoverStats({
                index,
                x: (index / (data.length - 1)) * 100 + '%',
                data: data[index]
            });
        }
    };

    // Smooth path generator (Catmull-Rom to Cubic Bezier)
    const getSmoothPath = (pointsKey) => {
        if (data.length === 0) return '';
        if (data.length === 1) return `M 0 ${getCoord(0, data[0][pointsKey]).y} L ${width} ${getCoord(0, data[0][pointsKey]).y}`;

        const points = data.map((d, i) => getCoord(i, d[pointsKey]));
        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i === 0 ? 0 : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;

            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
        }
        return path;
    };

    return (
        <div className="h-64 relative" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverStats(null)}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-400">
                <span>₹{(formatLargeNumber(maxRevenue))}</span>
                <span>₹{(formatLargeNumber(maxRevenue * 0.75))}</span>
                <span>₹{(formatLargeNumber(maxRevenue * 0.5))}</span>
                <span>₹{(formatLargeNumber(maxRevenue * 0.25))}</span>
                <span>₹0</span>
            </div>

            {/* Chart Area */}
            <div className="ml-14 h-full pb-8 relative cursor-pointer">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    {/* Gradients */}
                    <defs>
                        <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                        </linearGradient>
                        <linearGradient id="collectedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75].map(tick => (
                        <line key={tick} x1="0" y1={height * tick} x2={width} y2={height * tick} stroke="#f3f4f6" strokeWidth="1" />
                    ))}
                    <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />

                    {/* Revenue Area & Line */}
                    <path d={`${getSmoothPath('revenue')} L ${width} ${height} L 0 ${height} Z`} fill="url(#revenueGradient)" />
                    <path d={getSmoothPath('revenue')} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Collected Area & Line */}
                    <path d={`${getSmoothPath('collected')} L ${width} ${height} L 0 ${height} Z`} fill="url(#collectedGradient)" />
                    <path d={getSmoothPath('collected')} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Hover Line & Dots */}
                    {hoverStats && (
                        <>
                            <line
                                x1={getCoord(hoverStats.index, 0).x}
                                y1="0"
                                x2={getCoord(hoverStats.index, 0).x}
                                y2={height}
                                stroke="#9ca3af"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                            {/* Billed Dot */}
                            <circle
                                cx={getCoord(hoverStats.index, hoverStats.data.revenue).x}
                                cy={getCoord(hoverStats.index, hoverStats.data.revenue).y}
                                r="5"
                                fill="#fff"
                                stroke="#3b82f6"
                                strokeWidth="3"
                            />
                            {/* Collected Dot */}
                            <circle
                                cx={getCoord(hoverStats.index, hoverStats.data.collected).x}
                                cy={getCoord(hoverStats.index, hoverStats.data.collected).y}
                                r="5"
                                fill="#fff"
                                stroke="#10b981"
                                strokeWidth="3"
                            />
                        </>
                    )}
                </svg>

                {/* X-axis labels */}
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                    {data.map((m, i) => (
                        <span key={i}>{m.month_name}</span>
                    ))}
                </div>

                {/* Custom Tooltip */}
                {hoverStats && (
                    <div
                        className="absolute bg-white p-3 rounded-lg shadow-lg border border-gray-100 z-10 w-32 pointer-events-none transform -translate-x-1/2 -translate-y-full"
                        style={{
                            left: hoverStats.x,
                            top: Math.min(
                                getCoord(hoverStats.index, hoverStats.data.revenue).y,
                                getCoord(hoverStats.index, hoverStats.data.collected).y
                            ) - 10
                        }}
                    >
                        <p className="font-bold text-gray-900 mb-2">{hoverStats.data.month_name}</p>
                        <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between text-blue-600 font-medium">
                                <span>: ₹{(hoverStats.data.revenue / 100000).toFixed(2)}L</span>
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            </div>
                            <div className="flex items-center justify-between text-emerald-600 font-medium">
                                <span>: ₹{(hoverStats.data.collected / 100000).toFixed(2)}L</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DonutChart = ({ data }) => {
    // Simple, robust donut chart using stroke-dasharray
    const [hover, setHover] = useState(null);
    const size = 160;
    const center = size / 2;
    const radius = 70;
    const strokeWidth = 20;

    const total = (data.paid || 0) + (data.partial || 0) + (data.pending || 0);

    if (total === 0) return (
        <div className="flex items-center justify-center h-48 text-gray-400">No data</div>
    );

    const paidPct = (data.paid / total) * 100;
    const partialPct = (data.partial / total) * 100;
    const pendingPct = (data.pending / total) * 100;

    const circumference = 2 * Math.PI * radius;

    // Calculate offsets based on previous segments
    const paidOffset = 0;
    const partialOffset = -1 * (paidPct / 100) * circumference;
    const pendingOffset = -1 * ((paidPct + partialPct) / 100) * circumference;

    return (
        <div className="relative flex justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                {/* Background Circle */}
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />

                {data.paid > 0 && (
                    <circle
                        cx={center} cy={center} r={radius}
                        fill="none" stroke="#22c55e" strokeWidth={strokeWidth}
                        strokeDasharray={`${(paidPct / 100) * circumference} ${circumference}`}
                        strokeDashoffset={paidOffset}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHover({ name: 'Paid', value: data.paid, color: 'text-green-600' })}
                        onMouseLeave={() => setHover(null)}
                    />
                )}
                {data.partial > 0 && (
                    <circle
                        cx={center} cy={center} r={radius}
                        fill="none" stroke="#f59e0b" strokeWidth={strokeWidth}
                        strokeDasharray={`${(partialPct / 100) * circumference} ${circumference}`}
                        strokeDashoffset={partialOffset}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHover({ name: 'Partial', value: data.partial, color: 'text-amber-600' })}
                        onMouseLeave={() => setHover(null)}
                    />
                )}
                {data.pending > 0 && (
                    <circle
                        cx={center} cy={center} r={radius}
                        fill="none" stroke="#ef4444" strokeWidth={strokeWidth}
                        strokeDasharray={`${(pendingPct / 100) * circumference} ${circumference}`}
                        strokeDashoffset={pendingOffset}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHover({ name: 'Pending', value: data.pending, color: 'text-red-600' })}
                        onMouseLeave={() => setHover(null)}
                    />
                )}
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                {hover ? (
                    <>
                        <span className={`text-xl font-bold ${hover.color}`}>{hover.value}</span>
                        <p className="text-xs text-gray-500">{hover.name}</p>
                    </>
                ) : (
                    <>
                        <span className="text-xl font-bold text-gray-700">{total}</span>
                        <p className="text-xs text-gray-400">Cases</p>
                    </>
                )}
            </div>
        </div>
    );
};

const PaymentModeChart = ({ data }) => {
    const [hover, setHover] = useState(null);
    if (!data || data.length === 0) return <div className="text-center text-gray-400 py-10">No payment data</div>;

    const maxVal = Math.max(...data.map(d => parseInt(d.count)), 1);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

    return (
        <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2 relative">
            {/* Grid lines (simplified) */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[1, 0.75, 0.5, 0.25, 0].map(p => (
                    <div key={p} className="w-full border-t border-gray-100 h-0 relative">
                        <span className="absolute -left-6 -top-2 text-xs text-gray-400">{Math.round(maxVal * p)}</span>
                    </div>
                ))}
            </div>

            {data.slice(0, 5).map((item, i) => {
                const heightPercent = (parseInt(item.count) / maxVal) * 100;
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
                                <p className="font-semibold text-gray-800 mb-1">{item.payment_method}</p>
                                <p className="text-sm font-bold text-blue-600">: {item.count} ({Math.round(heightPercent)}%)</p>
                            </div>
                        )}

                        <div
                            className="w-full rounded-t-md transition-all duration-300 hover:opacity-90 max-w-[60px]"
                            style={{
                                height: `${heightPercent}%`,
                                backgroundColor: colors[i % colors.length]
                            }}
                        ></div>
                        <span className="text-xs text-gray-500 mt-2 truncate w-full text-center">{item.payment_method}</span>
                    </div>
                );
            })}
        </div>
    );
};

const HospitalOutstandingChart = ({ data }) => {
    const [hover, setHover] = useState(null);

    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                    <Building2 className="mx-auto mb-2 text-gray-300" size={40} />
                    <p>No hospital data available</p>
                </div>
            </div>
        );
    }

    const maxOutstanding = Math.max(...data.map(h => parseFloat(h.outstanding) || 0));

    return (
        <div className="space-y-4">
            {data.map((hospital, i) => {
                const percentage = maxOutstanding > 0 ? ((parseFloat(hospital.outstanding) / maxOutstanding) * 100) : 0;
                return (
                    <div
                        key={i}
                        className="relative flex items-center gap-4 group cursor-pointer"
                        onMouseEnter={() => setHover(hospital)}
                        onMouseLeave={() => setHover(null)}
                    >
                        <div className="w-28 text-sm text-gray-600 truncate group-hover:text-blue-600 transition-colors">
                            {hospital.hospital_name}
                        </div>
                        <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg transition-all duration-300 group-hover:from-amber-500 group-hover:to-amber-600"
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                        <div className="w-20 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(hospital.outstanding)}
                        </div>

                        {/* Tooltip */}
                        {hover === hospital && (
                            <div className="absolute left-1/2 bottom-full mb-2 bg-white shadow-xl border border-gray-100 p-2 rounded-lg z-20 w-48 text-center pointer-events-none transform -translate-x-1/2">
                                <p className="font-semibold text-gray-800 mb-1">{hospital.hospital_name}</p>
                                <p className="text-sm font-bold text-amber-600">
                                    Outstanding: {formatCurrency(hospital.outstanding)}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
