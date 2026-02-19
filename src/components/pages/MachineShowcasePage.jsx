'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Search, Package, MapPin, Calendar, Activity, Info } from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';

export default function MachineShowcasePage() {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        fetchMachines();
    }, [statusFilter, categoryFilter, searchQuery]);

    const fetchMachines = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (searchQuery) params.append('search', searchQuery);

            const response = await axios.get(`${API_ENDPOINTS.MACHINES}?${params.toString()}`);
            setMachines(response.data.machines || []);
        } catch (error) {
            console.error('Error fetching machines:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => val ? `₹${Number(val).toLocaleString('en-IN')}` : '₹0';
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    // Extract unique categories for filter
    const uniqueCategories = [...new Set(machines.map(m => m.category).filter(Boolean))];

    if (loading && !machines.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Machine Showcase</h1>
                    <p className="text-gray-600">Browse our available machinery inventory</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, model, serial..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <CustomSelect
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            options={[
                                { value: "all", label: "All Categories" },
                                ...uniqueCategories.map(c => ({ value: c, label: c }))
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {machines.map((machine) => (
                    <div
                        key={machine.id}
                        className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col"
                    >
                        {/* Image Section */}
                        <div className="relative h-64 bg-gray-100 border-b border-gray-100 group">
                            {machine.image_url ? (
                                <img
                                    src={machine.image_url}
                                    alt={machine.machine_name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center flex-col text-gray-400">
                                    <Package size={64} className="mb-2 opacity-50" />
                                    <span className="text-sm">No Image Available</span>
                                </div>
                            )}
                            <div className="absolute top-4 left-4">
                                <span className="px-3 py-1 bg-white/90 backdrop-blur text-[#004071] text-xs font-bold rounded-full shadow-sm">
                                    {machine.category || 'Uncategorized'}
                                </span>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{machine.machine_name}</h3>
                            <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                                <span className="font-medium text-gray-700">{machine.manufacturer}</span>
                                <span>•</span>
                                <span>{machine.model_number}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6">
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Serial Number</span>
                                    <span className="font-medium text-gray-900">{machine.serial_number || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Location</span>
                                    <div className="flex items-center gap-1">
                                        <MapPin size={14} className="text-[#19ADB8]" />
                                        <span className="font-medium text-gray-900">{machine.location || '-'}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Mfg Year</span>
                                    <span className="font-medium text-gray-900">{machine.Manufacturing_year || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase tracking-wide mb-1">Purchase Date</span>
                                    <div className="flex items-center gap-1">
                                        <Calendar size={14} className="text-[#19ADB8]" />
                                        <span className="font-medium text-gray-900">{formatDate(machine.purchase_date)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Purchase Price</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(machine.purchase_price)}</span>
                                </div>
                                <div className="h-px bg-gray-200"></div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Warranty Start</span>
                                    <span className="font-medium text-gray-900">{formatDate(machine.warranty_start_date)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Warranty Expiry</span>
                                    <span className={`font-medium ${new Date(machine.warranty_expiry) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatDate(machine.warranty_expiry)}
                                    </span>
                                </div>
                            </div>

                            {/* Specifications */}
                            {machine.specifications && (
                                <div className="mt-auto pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold text-sm">
                                        <Info size={16} className="text-[#004071]" />
                                        Specifications
                                    </div>
                                    <ul className="space-y-1">
                                        {machine.specifications.split('\n').filter(Boolean).slice(0, 4).map((spec, i) => (
                                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                <span className="text-[#19ADB8] mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current"></span>
                                                <span className="line-clamp-1">{spec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {!loading && machines.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No machines found</h3>
                    <p className="text-gray-500">Try adjusting your filters</p>
                </div>
            )}
        </div>
    );
}
