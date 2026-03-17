'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Search, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';

const PIPELINE_STAGES = [
    { id: 'consultation_scheduled', label: 'Consultation Scheduled', color: 'bg-blue-500' },
    { id: 'consulted', label: 'Consulted', color: 'bg-purple-500' },
    { id: 'preop_cleared', label: 'Pre-op Cleared', color: 'bg-teal-500' },
    { id: 'ot_scheduled', label: 'OT Scheduled', color: 'bg-indigo-500' },
    { id: 'surgery_done', label: 'Surgery Done', color: 'bg-green-500' },
    { id: 'discharge', label: 'Discharge', color: 'bg-orange-500' },
    { id: 'followup', label: 'Follow-up', color: 'bg-pink-500' }
];

export default function PipelinePage() {
    const router = useRouter();
    const { can, user } = usePermissions();
    const [cases, setCases] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchCases = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            const response = await axios.get(`/api/v1/pipeline?${params.toString()}`);
            setCases(response.data.cases || []);
            setStats(response.data.stats || {});
        } catch (error) {
            toast.error('Error fetching pipeline cases');
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    /* checkAuth and redundant duplicate useEffect removed */
    useEffect(() => { if (user) fetchCases(); }, [user, fetchCases]);

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getAvatarColor = (id) => {
        const colors = [
            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
            'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
        ];
        return colors[id % colors.length];
    };

    // Filter cases by status
    const filteredCases = statusFilter === 'all'
        ? cases
        : cases.filter(c => c.status === statusFilter);

    if (loading && !cases.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading pipeline...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Operations Pipeline</h1>
                    <p className="text-gray-600">{stats.total || 0} active cases across all stages</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => user && router.push(`/${user.role}/calendar`)}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#004071] text-[#004071] rounded-xl font-medium hover:bg-gray-50 transition-all"
                    >
                        <CalendarIcon size={20} />
                        Calendar View
                    </button>
                    {can('pipeline', 'manage') && (
                        <button
                            onClick={() => router.push('/admin/patients')}
                            className="flex items-center gap-2 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 transition-all"
                        >
                            <Plus size={20} />
                            Add Case
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by patient name, surgery type, doctor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                    />
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-gray-100">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'all'
                            ? 'bg-[#004071] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All ({stats.total || 0})
                    </button>
                    {PIPELINE_STAGES.map((stage) => (
                        <button
                            key={stage.id}
                            onClick={() => setStatusFilter(stage.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === stage.id
                                ? 'bg-[#004071] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {stage.label} ({stats[stage.id] || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Pipeline Cases Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCases.map((caseItem) => (
                    <div
                        key={caseItem.id}
                        onClick={() => user && router.push(`/${user.role}/pipeline/${caseItem.id}`)}
                        className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-[#19ADB8] hover:shadow-[#19ADB8] overflow-hidden group cursor-pointer"
                    >
                        <div className="p-6">
                            {/* Patient Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 ${getAvatarColor(caseItem.id)} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                                        {getInitials(caseItem.first_name, caseItem.last_name)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {caseItem.first_name} {caseItem.last_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">Case ID: {caseItem.id}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mb-3">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${caseItem.status === 'surgery_done' ? 'bg-green-50 text-green-700 border border-green-200' :
                                    caseItem.status === 'ot_scheduled' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                        caseItem.status === 'preop_cleared' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                                            caseItem.status === 'consulted' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                                caseItem.status === 'discharge' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                                    caseItem.status === 'followup' ? 'bg-pink-50 text-pink-700 border border-pink-200' :
                                                        'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                    {PIPELINE_STAGES.find(s => s.id === caseItem.status)?.label || caseItem.status}
                                </span>
                            </div>

                            {/* Case Details */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <span>{caseItem.surgery_type}</span>
                                </div>
                                {caseItem.surgeon_name && (
                                    <div className="flex items-center text-sm text-[#004071]">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Dr. {caseItem.surgeon_name}</span>
                                    </div>
                                )}
                                {caseItem.hospital_name && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <span>{caseItem.hospital_name}</span>
                                    </div>
                                )}
                                {caseItem.surgery_date && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>{formatDate(caseItem.surgery_date)}</span>
                                    </div>
                                )}
                                {caseItem.care_buddy_name && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span>Care Buddy: {caseItem.care_buddy_name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Progress */}
                            {caseItem.total_tasks > 0 && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                        <span className="font-medium">Progress</span>
                                        <span className="font-semibold">{caseItem.completed_tasks}/{caseItem.total_tasks} tasks</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-[#19ADB8] h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${caseItem.progress_percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Financial Info */}
                            {caseItem.estimated_cost && (
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Estimated Cost</span>
                                        <span className="text-lg font-semibold text-[#004071]">
                                            ₹{Number(caseItem.estimated_cost).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredCases.length === 0 && !loading && (
                <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No cases found</h3>
                    <p className="text-gray-600">
                        {statusFilter === 'all'
                            ? 'Start by adding a new case to the pipeline'
                            : `No cases in ${PIPELINE_STAGES.find(s => s.id === statusFilter)?.label} stage`
                        }
                    </p>
                </div>
            )}

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center mt-6">
                <p className="text-sm text-blue-800">
                    <span className="font-medium">Tip:</span> Use the status tabs above to filter cases by pipeline stage. Click on any case card to view full details.
                </p>
            </div>
        </div>
    );
}