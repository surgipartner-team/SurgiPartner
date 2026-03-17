'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import {
    TrendingUp, Clock, AlertTriangle, Calendar, Download, Search, Filter,
    Eye, Plus, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';

export default function FinancePage() {
    const { user } = usePermissions();
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState({ cases: [], stats: {}, statusBreakdown: {}, paymentModes: [], monthlyTrend: [] });
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('this_month');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('period', period);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (search) params.append('search', search);

            const response = await axios.get(`/api/v1/finance?${params.toString()}`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching finance data:', error);
            toast.error('Error fetching finance data');
        } finally {
            setLoading(false);
        }
    }, [period, statusFilter, search]);

    useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        if (num >= 100000) {
            return '₹' + (num / 100000).toFixed(1) + 'L';
        }
        return '₹' + num.toLocaleString('en-IN');
    };

    const formatFullCurrency = (amount) => {
        return '₹' + (parseFloat(amount) || 0).toLocaleString('en-IN');
    };

    const getStatusBadge = (status) => {
        const styles = {
            paid: 'bg-green-100 text-green-700 border-green-200',
            partial: 'bg-amber-100 text-amber-700 border-amber-200',
            pending: 'bg-red-100 text-red-700 border-red-200'
        };
        return styles[status] || 'bg-gray-100 text-gray-700';
    };

    // Calculate chart data
    const maxRevenue = Math.max(...data.monthlyTrend.map(m => parseFloat(m.revenue) || 0), 1);

    const handleExport = () => {
        if (!data.cases || data.cases.length === 0) {
            toast.info('No data to export');
            return;
        }

        const headers = ['Case ID', 'Case Number', 'Patient Name', 'Phone', 'Surgery Type', 'Total Amount', 'Paid Amount', 'Outstanding', 'Status', 'Date'];
        const csvContent = [
            headers.join(','),
            ...data.cases.map(c => [
                c.case_id,
                c.case_number,
                `"${c.patient_name}"`,
                `"\t${c.patient_phone}"`, // Tab forces Excel to treat as text
                `"${c.surgery_type}"`,
                c.total_amount,
                c.paid_amount,
                c.outstanding,
                c.payment_status,
                new Date(c.created_at).toISOString().split('T')[0]
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `finance_report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && !data.cases.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Finance & Payments</h1>
                    <p className="text-gray-500">Comprehensive financial tracking and payment management</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
                        <Calendar size={18} className="text-gray-500" />
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm font-medium text-gray-700 w-full"
                        >
                            <option value="today">Today</option>
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                            <option value="this_year">This Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                    <button
                        onClick={handleExport}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        <Download size={18} />
                        <span className="text-sm font-medium">Export Report</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Collected */}
                <div className="bg-gradient-to-br from-[#004071] to-[#00335a] rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <TrendingUp size={20} />
                    </div>
                    <div className="absolute top-4 right-16 px-2 py-0.5 bg-white/20 rounded text-xs flex items-center gap-1">
                        <ArrowUpRight size={12} /> {data.stats.collection_rate || 0}%
                    </div>
                    <p className="text-white/80 text-sm mb-1 mt-8">Total Collected</p>
                    <p className="text-3xl font-bold">{formatCurrency(data.stats.total_collected)}</p>
                    <p className="text-white/60 text-sm mt-1">Collection rate: {data.stats.collection_rate || 0}%</p>
                </div>

                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-lg">₹</span>
                    </div>
                    <span className="absolute top-4 right-16 px-2 py-0.5 bg-white/20 rounded text-xs">Revenue</span>
                    <p className="text-white/80 text-sm mb-1 mt-8">Total Revenue</p>
                    <p className="text-3xl font-bold">{formatCurrency(data.stats.total_revenue)}</p>
                    <p className="text-white/60 text-sm mt-1">Across {data.stats.case_count || 0} cases</p>
                </div>

                {/* Pending */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Clock size={20} />
                    </div>
                    <div className="absolute top-4 right-16 px-2 py-0.5 bg-white/20 rounded text-xs flex items-center gap-1">
                        <ArrowDownRight size={12} /> {data.stats.total_revenue > 0 ? (100 - parseFloat(data.stats.collection_rate)).toFixed(1) : 0}%
                    </div>
                    <p className="text-white/80 text-sm mb-1 mt-8">Pending</p>
                    <p className="text-3xl font-bold">{formatCurrency(data.stats.total_pending)}</p>
                    <p className="text-white/60 text-sm mt-1">Outstanding amount</p>
                </div>

                {/* Overdue */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <AlertTriangle size={20} />
                    </div>
                    <span className="absolute top-4 right-16 px-2 py-0.5 bg-white/20 rounded text-xs">Urgent</span>
                    <p className="text-white/80 text-sm mb-1 mt-8">Overdue</p>
                    <p className="text-3xl font-bold">{formatCurrency(data.stats.overdue)}</p>
                    <p className="text-white/60 text-sm mt-1">Needs follow-up</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white p-1 rounded-lg border border-gray-200 w-fit">
                {['overview', 'transactions', 'reports'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${activeTab === tab
                            ? 'bg-[#004071] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Revenue & Collection Trend */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-900">Revenue & Collection Trend</h3>
                                <p className="text-sm text-gray-500">Monthly performance</p>
                            </div>
                            {data.monthlyTrend.length > 0 && maxRevenue > 1 ? (
                                <RevenueChart data={data.monthlyTrend} maxRevenue={maxRevenue} />
                            ) : (
                                <div className="h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                    <div className="text-center">
                                        <TrendingUp className="mx-auto mb-2 text-gray-300" size={40} />
                                        <p>No trend data available for this period</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Billed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Collected</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Status */}
                        <div className="bg-white rounded-xl border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Payment Status</h3>
                                    <p className="text-sm text-gray-500">Cases breakdown</p>
                                </div>
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Overview</span>
                            </div>

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

                    {/* Payment Mode Distribution - Full Width */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6 mt-6">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Payment Mode Distribution</h3>
                            <p className="text-sm text-gray-500">How patients are paying</p>
                        </div>
                        <PaymentModeChart data={data.paymentModes} />
                    </div>
                </>
            )}

            {activeTab === 'transactions' && (
                <div>
                    {/* Search & Filter */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by patient name or case ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div className="flex items-center gap-2 px-3 border border-gray-200 rounded-lg">
                                <Filter size={18} className="text-gray-400" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="border-none bg-transparent focus:outline-none text-sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="partial">Partial</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">All Transactions</h3>
                            <p className="text-sm text-gray-500">{data.cases.length} cases found</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Case ID</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Surgery</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Total Amount</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Paid</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Outstanding</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.cases.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                No transactions found
                                            </td>
                                        </tr>
                                    ) : (
                                        data.cases.map((c) => (
                                            <tr key={c.case_id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-[#19ADB8]">{c.case_number}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{c.patient_name}</p>
                                                        <p className="text-xs text-gray-500">{c.patient_phone}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{c.surgery_type}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                                                    {formatFullCurrency(c.total_amount)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-green-600 text-right font-medium">
                                                    {formatFullCurrency(c.paid_amount)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-amber-600 text-right font-medium">
                                                    {formatFullCurrency(c.outstanding)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded border capitalize ${getStatusBadge(c.payment_status)}`}>
                                                        {c.payment_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payment Mode Distribution */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Payment Mode Distribution</h3>
                            <p className="text-sm text-gray-500">How patients are paying</p>
                        </div>
                        {data.paymentModes.length > 0 ? (
                            <PaymentModeChart data={data.paymentModes} />
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400">
                                No payment data available
                            </div>
                        )}
                    </div>

                    {/* Collection Summary */}
                    <div className="bg-white rounded-xl border border-gray-100 p-6">
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900">Collection Summary</h3>
                            <p className="text-sm text-gray-500">Financial overview</p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-600">Total Revenue</span>
                                <span className="text-lg font-bold text-gray-900">{formatFullCurrency(data.stats.total_revenue)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-600">Total Collected</span>
                                <span className="text-lg font-bold text-green-600">{formatFullCurrency(data.stats.total_collected)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-gray-600">Total Pending</span>
                                <span className="text-lg font-bold text-amber-600">{formatFullCurrency(data.stats.total_pending)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-gray-600">Collection Rate</span>
                                <span className="text-lg font-bold text-[#19ADB8]">{data.stats.collection_rate || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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



// Helper for currency in tooltip
const formatFullCurrency = (amount) => {
    if (amount >= 1000) return '₹' + (amount / 1000).toFixed(2) + 'K';
    return '₹' + amount;
};


