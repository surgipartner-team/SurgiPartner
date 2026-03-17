'use client';

import React, { useState, useEffect } from 'react';
import RoleLayout from '@/components/layouts/RoleLayout';
import {
  DollarSign,
  Activity,
  TrendingUp,
  AlertCircle,
  Users,
  UserCheck,
  Calendar,
  CheckCircle2,
  ArrowRight,
  FileText,
  Stethoscope
} from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import Link from 'next/link';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {
      revenue: 0,
      revenueGrowth: 0,
      activeCases: 0,
      scheduledSurgeries: 0,
      conversionRate: 0,
      totalLeads: 0,
      convertedLeads: 0,
      arOutstanding: 0,
      leadsToday: 0,
      conversions: 0,
      otScheduled: 0,
      completed: 0
    },
    revenueTrend: [],
    leadStatus: [],
    surgeryTypes: [],
    recentCases: [],
    growthTrends: [] // Leads vs Surgeries over time
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [financeRes, leadsRes, pipelineRes] = await Promise.all([
        axios.get(API_ENDPOINTS.FINANCE),
        axios.get(API_ENDPOINTS.LEADS), // Assumes admin can see all
        axios.get(API_ENDPOINTS.PIPELINE) // Assumes admin can see all
      ]);

      const finance = financeRes.data.stats || {};
      const revenueTrendData = financeRes.data.monthlyTrend || [];
      const leads = leadsRes.data.leads || [];
      const cases = pipelineRes.data.cases || [];

      // --- Process Stats ---

      // Revenue
      const revenue = parseFloat(finance.total_revenue || 0);
      const arOutstanding = parseFloat(finance.total_pending || 0);

      // Active Cases / Surgeries
      const activeCasesList = cases.filter(c => !['completed', 'cancelled', 'discharge', 'surgery_done'].includes(c.status));
      const activeCases = activeCasesList.length;
      const scheduledSurgeries = cases.filter(c => ['ot_scheduled', 'admission'].includes(c.status)).length;
      const completedCases = cases.filter(c => ['surgery_done', 'discharge', 'completed'].includes(c.status)).length;
      const otScheduled = cases.filter(c => c.status === 'ot_scheduled').length;

      // Leads
      const totalLeads = leads.length;
      const convertedLeads = leads.filter(l => l.status === 'converted' || l.status === 'surgery/patient').length; // Adjust status check
      const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;
      const today = new Date().toISOString().split('T')[0];
      const leadsToday = leads.filter(l => l.created_at && l.created_at.startsWith(today)).length;
      const conversions = leads.filter(l => l.status === 'converted').length; // Keep simple

      // --- Process Charts ---

      // 1. Revenue Trend (Prepare for Recharts)
      const revenueTrend = revenueTrendData.map(m => ({
        name: m.month_name,
        Revenue: parseFloat(m.revenue),
        Target: parseFloat(m.revenue) * 1.1 // Mock target as 10% higher for visual
      })).reverse(); // API likely returns newest first? Check invoice sorting. billing route sorts DESC. monthlyTrend group by date.
      // Actually monthlyTrend query usually sorts by month. Let's assume ascending or sort it.
      // finance route: GROUP BY month ORDER BY month DESC usually? 
      // In route.js: `GROUP BY month ORDER BY month DESC LIMIT 6`. So we need to reverse.

      // 2. Lead Status (Donut)
      const statusCounts = leads.reduce((acc, curr) => {
        const s = curr.status || 'New';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      const leadStatus = Object.keys(statusCounts).map(s => ({ name: s, value: statusCounts[s] }));

      // 3. Surgery Types (Bar)
      const typeCounts = cases.reduce((acc, curr) => {
        const t = curr.surgery_type || 'General';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});
      const surgeryTypes = Object.keys(typeCounts)
        .map(t => ({ name: t, count: typeCounts[t] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 4. Growth Trends (Line - Leads vs Surgeries)
      // Aggregate by month for last 6 months
      const getLast6Months = () => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          months.push(d.toISOString().slice(0, 7)); // YYYY-MM
        }
        return months;
      };
      const months = getLast6Months();
      const growthTrends = months.map(month => {
        const leadsCount = leads.filter(l => l.created_at && l.created_at.startsWith(month)).length;
        const surgeriesCount = cases.filter(c => c.surgery_date && c.surgery_date.startsWith(month)).length;
        const monthName = new Date(month + '-01').toLocaleString('default', { month: 'short' });
        return {
          name: monthName,
          Leads: leadsCount,
          Surgeries: surgeriesCount
        };
      });

      // --- Recent Cases ---
      const recentCases = cases
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 5);

      setData({
        stats: {
          revenue,
          activeCases,
          scheduledSurgeries,
          conversionRate,
          totalLeads,
          convertedLeads,
          arOutstanding,
          leadsToday,
          conversions,
          otScheduled,
          completed: completedCases
        },
        revenueTrend: revenueTrend, // Check if needs reverse in frontend
        leadStatus,
        surgeryTypes,
        recentCases,
        growthTrends
      });

    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString()}`;
  };

  if (loading) {
    return (
      <RoleLayout allowedRole="admin">
        <div className="p-6 flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </RoleLayout>
    );
  }

  return (
    <RoleLayout allowedRole="admin">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, Admin User</h1>
          <p className="text-gray-500">Here's your performance overview for today</p>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.stats.revenue)}
            subtitle="Total revenue generated"
            icon={DollarSign}
            theme="blue"
          />
          <StatCard
            title="Active Cases"
            value={data.stats.activeCases}
            subtitle={`${data.stats.scheduledSurgeries} surgeries scheduled`}
            icon={Activity}
            theme="purple"
          />
          <StatCard
            title="Conversion Rate"
            value={`${data.stats.conversionRate}%`}
            subtitle={`${data.stats.convertedLeads} of ${data.stats.totalLeads} leads converted`}
            icon={TrendingUp}
            theme="teal"
          />
          <StatCard
            title="AR Outstanding"
            value={formatCurrency(data.stats.arOutstanding)}
            subtitle={`Across ${data.stats.activeCases} active cases`}
            icon={AlertCircle}
            theme="orange"
          />
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MiniStatCard icon={Users} value={data.stats.leadsToday} label="Leads Today" color="text-blue-600" bg="bg-blue-50" />
          <MiniStatCard icon={UserCheck} value={data.stats.conversions} label="Conversions" color="text-purple-600" bg="bg-purple-50" />
          <MiniStatCard icon={Calendar} value={data.stats.otScheduled} label="OT Scheduled" color="text-teal-600" bg="bg-teal-50" />
          <MiniStatCard icon={CheckCircle2} value={data.stats.completed} label="Completed" color="text-green-600" bg="bg-green-50" />
        </div>

        {/* Charts Row 1: Revenue & Lead Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-900">Revenue Performance</h3>
                <p className="text-sm text-gray-500">Monthly revenue vs target</p>
              </div>
              <button className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">View Report</button>
            </div>
            <RevenueAreaChart data={data.revenueTrend} />
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900">Lead Status</h3>
              <p className="text-sm text-gray-500">Current distribution</p>
            </div>
            <DonutChart data={data.leadStatus} />
          </div>
        </div>

        {/* Charts Row 2: Surgery Types (Full Width) */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900">Surgery Types</h3>
            <p className="text-sm text-gray-500">Top procedures breakdown</p>
          </div>
          <SurgeryTypeBarChart data={data.surgeryTypes} />
        </div>

        {/* Recent Cases & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Recent Cases</h3>
              <Link href="/ops/pipeline" className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                View All <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {data.recentCases.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                      {c.first_name?.[0]}{c.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-500">{c.surgery_type} • {c.hospital_name}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-full lowercase">
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <QuickActionLink href="/admin/leads" icon={Users} title="View All Leads" subtitle={`${data.stats.totalLeads} total leads`} />
              <QuickActionLink href="/ops/pipeline" icon={Activity} title="Ops Pipeline" subtitle={`${data.stats.activeCases} active cases`} />
              <QuickActionLink href="/admin/patients" icon={FileText} title="Patient Records" subtitle="View & manage" />
              <QuickActionLink href="/admin/hospitals" icon={Stethoscope} title="Hospital Partners" subtitle="B2B management" />
            </div>
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}

// --- Components ---

const StatCard = ({ title, value, subtitle, icon: Icon, theme, trend }) => {
  const themes = {
    blue: "bg-blue-600 text-white",
    purple: "bg-purple-600 text-white",
    teal: "bg-teal-500 text-white",
    orange: "bg-orange-500 text-white"
  };
  const iconThemes = {
    blue: "bg-white/20",
    purple: "bg-white/20",
    teal: "bg-white/20",
    orange: "bg-white/20"
  };

  return (
    <div className={`rounded-2xl p-6 ${themes[theme] || themes.blue} shadow-sm relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconThemes[theme]}`}>
          <Icon size={24} className="text-white" />
        </div>
        {trend && (
          <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-white">
            {trend}
          </span>
        )}
      </div>
      <p className="text-white/80 text-sm mb-1">{title}</p>
      <h3 className="text-3xl font-bold mb-1">{value}</h3>
      <p className="text-white/60 text-xs">{subtitle}</p>
    </div>
  );
};

const MiniStatCard = ({ icon: Icon, value, label, color, bg }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const QuickActionLink = ({ href, icon: Icon, title, subtitle }) => (
  <Link href={href} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all group bg-white">
    <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
      <Icon size={20} />
    </div>
    <div>
      <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  </Link>
);

// --- Chart Components (Simplified for specific needs) ---

// --- Chart Components ---

const RevenueAreaChart = ({ data }) => {
  const [hover, setHover] = useState(null);
  if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No data</div>;

  // Normalize data for chart
  const maxVal = Math.max(...data.map(d => Math.max(d.Revenue, d.Target)), 1000) * 1.2;
  // Helper to map value to percentage height
  const getHeightPct = (val) => (val / maxVal) * 100;

  // Helper for formatting Y-axis labels
  const formatAxisLabel = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  // Single data point case: Render as a Bar
  if (data.length === 1) {
    const d = data[0];
    return (
      <div className="h-64 relative w-full select-none pt-8 pb-6 pl-12 pr-4">
        {/* Legend */}
        <div className="absolute top-0 right-0 flex gap-4 text-xs z-10">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Actual Revenue</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Target</div>
        </div>

        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-8 bottom-6 w-12 flex flex-col justify-between text-[10px] text-gray-400 font-medium text-right pr-2">
          {[1, 0.75, 0.5, 0.25, 0].map(p => <span key={p}>{formatAxisLabel(maxVal * p)}</span>)}
        </div>

        {/* Grid Lines */}
        <div className="absolute inset-0 left-12 right-4 top-8 bottom-6 flex flex-col justify-between pointer-events-none">
          {[1, 0.75, 0.5, 0.25, 0].map(p => <div key={p} className="w-full border-t border-gray-100 h-0"></div>)}
        </div>

        {/* Single Bar Display */}
        <div className="absolute inset-0 left-12 right-4 top-8 bottom-6 flex items-end justify-center">
          {/* Target Line (Dashed) */}
          <div className="absolute w-1/4 border-t-2 border-indigo-400 border-dashed z-20" style={{ bottom: `${getHeightPct(d.Target)}%` }}></div>

          {/* Revenue Bar */}
          <div
            className="w-1/6 bg-gradient-to-t from-blue-50 to-blue-100 border-t-4 border-blue-500 rounded-t-sm relative group cursor-pointer transition-all hover:bg-blue-100"
            style={{ height: `${getHeightPct(d.Revenue)}%` }}
            onMouseEnter={() => setHover(d)}
            onMouseLeave={() => setHover(null)}
          >
            {/* Hover Dot Effect */}
            <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* X-Axis Label */}
        <div className="absolute bottom-0 left-12 right-4 flex justify-center text-xs text-gray-400">
          <span>{d.name}</span>
        </div>

        {/* Tooltip */}
        {hover && (
          <div className="absolute bg-white shadow-xl border border-gray-100 p-3 rounded-lg z-30 top-10 left-1/2 transform -translate-x-1/2 text-sm pointer-events-none min-w-[120px]">
            <p className="font-semibold text-gray-900 mb-1">{hover.name}</p>
            <p className="text-blue-600">Revenue: ₹{hover.Revenue.toLocaleString()}</p>
            <p className="text-indigo-400 text-xs">Target: ₹{Math.round(hover.Target).toLocaleString()}</p>
          </div>
        )}
      </div>
    );
  }

  const width = 100;
  const height = 100;
  const padding = 0; // Padding handled by HTML container

  // Helper to map value to coordinate
  const getX = (i) => (i / (data.length - 1)) * 100;
  const getY = (val) => 100 - ((val / maxVal) * 100);

  // Generate smooth path (Cubic Bezier)
  const generatePath = (key) => {
    let path = `M ${getX(0)} ${getY(data[0][key])}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = getX(i);
      const y0 = getY(data[i][key]);
      const x1 = getX(i + 1);
      const y1 = getY(data[i + 1][key]);
      const cp1x = x0 + (x1 - x0) / 2;
      const cp1y = y0;
      const cp2x = x1 - (x1 - x0) / 2;
      const cp2y = y1;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}`;
    }
    return path;
  };

  const revenuePath = generatePath('Revenue');
  const targetPath = generatePath('Target');
  const areaPath = `${revenuePath} L ${100} ${100} L ${0} ${100} Z`;

  return (
    <div className="h-64 relative w-full select-none pt-8 pb-6 pl-12 pr-4">
      {/* Legend */}
      <div className="absolute top-0 right-0 flex gap-4 text-xs z-10">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Actual Revenue</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Target</div>
      </div>

      {/* Y-Axis Labels */}
      <div className="absolute left-0 top-8 bottom-6 w-12 flex flex-col justify-between text-[10px] text-gray-400 font-medium text-right pr-2">
        {[1, 0.75, 0.5, 0.25, 0].map(p => <span key={p}>{formatAxisLabel(maxVal * p)}</span>)}
      </div>

      {/* Chart Area */}
      <div className="absolute inset-0 left-12 right-4 top-8 bottom-6">
        {/* Grid Lines Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
          {[1, 0.75, 0.5, 0.25, 0].map(p => <div key={p} className="w-full border-t border-gray-100 h-0"></div>)}
        </div>

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible z-10 relative">
          <defs>
            <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Target Line (Dashed) */}
          <path d={targetPath} fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 2" vectorEffect="non-scaling-stroke" />

          {/* Revenue Area & Line */}
          <path d={areaPath} fill="url(#revenueGradient)" />
          <path d={revenuePath} fill="none" stroke="#3b82f6" strokeWidth="3" vectorEffect="non-scaling-stroke" />

          {/* Interactive Points */}
          {data.map((d, i) => (
            <g key={i} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
              <circle cx={getX(i)} cy={getY(d.Revenue)} r="5" fill="transparent" />
              <circle
                cx={getX(i)} cy={getY(d.Revenue)}
                r={hover === d ? "4" : "0"}
                fill="#3b82f6" stroke="white" strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-200"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {hover && (
        <div className="absolute bg-white shadow-xl border border-gray-100 p-3 rounded-lg z-20 top-0 left-1/2 transform -translate-x-1/2 -mt-2 text-sm pointer-events-none min-w-[120px]">
          <p className="font-semibold text-gray-900 mb-1">{hover.name}</p>
          <p className="text-blue-600">Revenue: ₹{hover.Revenue.toLocaleString()}</p>
          <p className="text-indigo-400 text-xs">Target: ₹{Math.round(hover.Target).toLocaleString()}</p>
        </div>
      )}

      {/* X-Axis Labels */}
      <div className="absolute bottom-0 left-12 right-4 flex justify-between text-xs text-gray-400">
        {data.map((d, i) => <span key={i}>{d.name}</span>)}
      </div>
    </div>
  );
};

const DonutChart = ({ data }) => {
  const [hover, setHover] = useState(null);
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

  if (total === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No data</div>;

  let currentAngle = 0;
  const r = 80;
  const c = 100;
  const strokeWidth = 25;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center relative">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        {data.map((item, i) => {
          const percentage = item.value / total;
          const strokeDasharray = `${percentage * circumference} ${circumference}`;
          const strokeDashoffset = -currentAngle * circumference;
          currentAngle += percentage;
          const color = colors[i % colors.length];

          return (
            <circle
              key={i}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 cursor-pointer ease-out"
              style={{ opacity: hover && hover.name !== item.name ? 0.3 : 1 }}
              onMouseEnter={() => setHover(item)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>

      {/* Center Text (Interactive) */}
      <div className="absolute top-[80px] pointer-events-none text-center">
        {hover ? (
          <>
            <p className="text-2xl font-bold text-gray-900">{hover.value}</p>
            <p className="text-xs text-gray-500 capitalize">{hover.name}</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Total Leads</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 w-full max-w-[240px]">
        {data.map((item, i) => (
          <div key={i} className="flex items-center text-sm group cursor-default" onMouseEnter={() => setHover(item)} onMouseLeave={() => setHover(null)}>
            <div className={`w-3 h-3 rounded-full mr-2 transition-transform group-hover:scale-125`} style={{ background: colors[i % colors.length] }}></div>
            <span className={`truncate flex-1 ${hover && hover.name === item.name ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{item.name}</span>
            <span className="font-semibold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


const SurgeryTypeBarChart = ({ data }) => {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-gray-400">No data</div>;
  const max = Math.max(...data.map(d => d.count));

  return (
    <div className="space-y-4 h-64 overflow-y-auto pr-2">
      {data.map((item, i) => (
        <div key={i} className="group cursor-pointer">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">{item.name}</span>
            <span className="text-gray-500">{item.count}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full group-hover:bg-teal-600 transition-all duration-500"
              style={{ width: `${(item.count / max) * 100}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const GrowthLineChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No data</div>;
  const max = Math.max(...data.map(d => Math.max(d.Leads, d.Surgeries)), 10);

  // Simple polyline implementation
  const getPoints = (key) => data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d[key] / max) * 100);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="h-64 relative pt-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* Grid */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="#f3f4f6" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#f3f4f6" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#f3f4f6" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

        {/* Leads Line */}
        <polyline points={getPoints('Leads')} fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => (
          <circle key={`l-${i}`} cx={(i / (data.length - 1)) * 100} cy={100 - (d.Leads / max) * 100} r="4" fill="#3b82f6" stroke="white" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <title>Leads: {d.Leads}</title>
          </circle>
        ))}

        {/* Surgeries Line */}
        <polyline points={getPoints('Surgeries')} fill="none" stroke="#8b5cf6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => (
          <circle key={`s-${i}`} cx={(i / (data.length - 1)) * 100} cy={100 - (d.Surgeries / max) * 100} r="4" fill="#8b5cf6" stroke="white" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <title>Surgeries: {d.Surgeries}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        {data.map((d, i) => <span key={i}>{d.name}</span>)}
      </div>
      <div className="flex justify-center gap-4 mt-2">
        <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Leads</div>
        <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-2 h-2 rounded-full bg-violet-500"></span> Surgeries</div>
      </div>
    </div>
  );
};