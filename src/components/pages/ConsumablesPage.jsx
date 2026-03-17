'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Search, Package, TrendingDown, AlertTriangle, DollarSign, Plus, Edit2, Trash2, X, Download, Grid3X3, List, MapPin, Calendar, TrendingUp } from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';

export default function ConsumablesPage() {
    const router = useRouter();
    const { can, user } = usePermissions();
    const [consumables, setConsumables] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedConsumable, setSelectedConsumable] = useState(null);

    const categories = ['Surgical', 'Disposable', 'Implant', 'Suture', 'Pharmaceutical', 'PPE', 'Other'];

    const fetchConsumables = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (searchQuery) params.append('search', searchQuery);
            const response = await axios.get(`${API_ENDPOINTS.CONSUMABLES}?${params.toString()}`);
            setConsumables(response.data.consumables || []);
            setStats(response.data.stats || {});
        } catch (error) {
            toast.error('Error fetching consumables');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, categoryFilter, searchQuery]);

    /* checkAuth and redundant duplicate useEffect have been removed */
    useEffect(() => { if (user) fetchConsumables(); }, [user, fetchConsumables]);

    const handleAddConsumable = async (formData) => {
        try {
            await axios.post(API_ENDPOINTS.CONSUMABLES, formData);
            fetchConsumables();
            setShowAddModal(false);
            toast.success('Consumable added successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error adding consumable');
        }
    };

    const handleUpdateConsumable = async (updates) => {
        try {
            await axios.put(API_ENDPOINTS.CONSUMABLES, updates);
            fetchConsumables();
            setShowEditModal(false);
            setSelectedConsumable(null);
            toast.success('Consumable updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error updating consumable');
        }
    };

    const handleDeleteConsumable = async () => {
        if (!selectedConsumable) return;
        try {
            await axios.delete(`${API_ENDPOINTS.CONSUMABLES}?id=${selectedConsumable.id}`);
            fetchConsumables();
            setShowDeleteModal(false);
            setSelectedConsumable(null);
            toast.success('Consumable deleted successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error deleting consumable');
        }
    };

    const handleAssignConsumable = async (data) => {
        try {
            await axios.post('/api/v1/consumables/assign', data);
            fetchConsumables();
            setShowAssignModal(false);
            setSelectedConsumable(null);
            toast.success('Consumable assigned successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error assigning consumable');
        }
    };

    const handleExport = () => {
        const headers = ['Item Name', 'SKU', 'Category', 'Manufacturer', 'Unit Price', 'Stock Qty', 'Reorder Level', 'Status', 'Storage Location', 'Expiry Date'];
        const csvData = consumables.map(c => [
            c.item_name, c.sku, c.category, c.manufacturer, c.unit_price, c.stock_quantity,
            c.reorder_level, c.status, c.storage_location, c.expiry_date
        ]);
        const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consumables_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Export successful!');
    };

    const formatCurrency = (val) => val ? `₹${Number(val).toLocaleString('en-IN')}` : '₹0';
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    const getStatusBadge = (status) => {
        const styles = {
            'In Stock': 'bg-green-100 text-green-700 border border-green-200',
            'Low Stock': 'bg-amber-100 text-amber-700 border border-amber-200',
            'Out of Stock': 'bg-red-100 text-red-700 border border-red-200'
        };
        return styles[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
    };

    const getCategoryBadge = (category) => {
        const styles = {
            'Surgical': 'bg-blue-50 text-blue-700',
            'Disposable': 'bg-gray-50 text-gray-700',
            'Implant': 'bg-purple-50 text-purple-700',
            'Suture': 'bg-cyan-50 text-cyan-700',
            'Pharmaceutical': 'bg-emerald-50 text-emerald-700',
            'PPE': 'bg-orange-50 text-orange-700',
            'Other': 'bg-slate-50 text-slate-700'
        };
        return styles[category] || 'bg-gray-50 text-gray-700';
    };

    if (loading && !consumables.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading consumables...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Consumables (B2B)</h1>
                    <p className="text-gray-600">{consumables.length} of {stats?.total || 0} items</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#004071] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Grid3X3 size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#004071] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-700"
                    >
                        <Download size={18} />
                        Export
                    </button>
                    {can('consumables', 'create') && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#19ADB8] hover:bg-[#17999f] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 transition-all"
                        >
                            <Plus size={20} />
                            Add Consumable
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                            <Package className="text-[#004071]" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.total || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Total SKUs</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <DollarSign className="text-green-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.total_value)}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Inventory Value</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <TrendingDown className="text-amber-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.low_stock_count || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Low Stock</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.out_of_stock_count || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Out of Stock</h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search consumables by name, SKU, or manufacturer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                        />
                    </div>
                    <div className="w-full md:w-56">
                        <CustomSelect
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            options={[
                                { value: "all", label: "All Categories" },
                                ...categories.map(c => ({ value: c, label: c }))
                            ]}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <CustomSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "all", label: "All Statuses" },
                                { value: "In Stock", label: "In Stock" },
                                { value: "Low Stock", label: "Low Stock" },
                                { value: "Out of Stock", label: "Out of Stock" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Consumables Grid/List */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {consumables.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-[#19ADB8] overflow-hidden group"
                        >
                            {/* Image */}
                            <div className="relative h-48 bg-gray-100">
                                {item.image_url ? (
                                    <Image src={item.image_url} alt={item.item_name} fill className="object-cover" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="text-gray-300" size={60} />
                                    </div>
                                )}
                                <span className={`absolute top-3 left-3 px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(item.status)}`}>
                                    {item.status}
                                </span>
                                <div className="absolute top-3 right-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {can('consumables', 'edit') && (
                                        <>
                                            <button
                                                onClick={() => { setSelectedConsumable(item); setShowAssignModal(true); }}
                                                className="p-2 bg-white rounded-lg hover:bg-teal-50 text-gray-600 hover:text-teal-600 shadow-sm"
                                                title="Assign to Hospital"
                                            >
                                                <TrendingUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedConsumable(item); setShowEditModal(true); }}
                                                className="p-2 bg-white rounded-lg hover:bg-gray-50 text-gray-600 hover:text-[#004071] shadow-sm"
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedConsumable(item); setShowDeleteModal(true); }}
                                                className="p-2 bg-white rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 shadow-sm"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-1 truncate">{item.item_name}</h3>
                                <p className="text-sm text-gray-500 mb-3">{item.manufacturer}</p>

                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryBadge(item.category)}`}>
                                        {item.category}
                                    </span>
                                    <span className="text-xs text-gray-500">{item.sku}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                    <div>
                                        <span className="text-gray-500">Stock</span>
                                        <p className="font-medium">{item.unit}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Reorder</span>
                                        <p className="font-medium">{item.reorder_level}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <div>
                                        <span className="text-xs text-gray-500">Unit Price</span>
                                        <p className="font-bold text-[#004071]">{formatCurrency(item.unit_price)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500">Total Value</span>
                                        <p className="font-bold text-gray-900">{formatCurrency(item.stock_quantity * item.unit_price)}</p>
                                    </div>
                                </div>

                                {item.storage_location && (
                                    <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                                        <MapPin size={12} />
                                        <span>{item.storage_location}</span>
                                    </div>
                                )}
                                {item.expiry_date && (
                                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                        <Calendar size={12} />
                                        <span>Expires: {formatDate(item.expiry_date)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Item</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">SKU</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Category</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Stock</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Unit Price</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {consumables.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                                                {item.image_url ? (
                                                    <Image src={item.image_url} alt="" fill className="object-cover rounded-lg" unoptimized />
                                                ) : (
                                                    <Package className="text-gray-400" size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{item.item_name}</p>
                                                <p className="text-sm text-gray-500">{item.manufacturer}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{item.sku}</td>
                                    <td className="px-6 py-4 hidden lg:table-cell">
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryBadge(item.category)}`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 hidden sm:table-cell">{item.stock_quantity} {item.unit}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 hidden sm:table-cell">{formatCurrency(item.unit_price)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {can('consumables', 'delete') && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setSelectedConsumable(item); setShowEditModal(true); }}
                                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-[#004071]"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedConsumable(item); setShowDeleteModal(true); }}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {consumables.length === 0 && !loading && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No consumables found</h3>
                    <p className="text-gray-600 mb-4">
                        {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Add your first consumable to get started'}
                    </p>
                    {can('consumables', 'create') && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#19ADB8] hover:bg-[#17999f] text-white rounded-xl font-medium"
                        >
                            <Plus size={20} />
                            Add Your First Consumable
                        </button>
                    )}
                </div>
            )}

            {/* Modals */}
            {showAddModal && <AddConsumableDialog categories={categories} onClose={() => setShowAddModal(false)} onSubmit={handleAddConsumable} />}
            {showEditModal && selectedConsumable && <EditConsumableDialog consumable={selectedConsumable} categories={categories} onClose={() => setShowEditModal(false)} onSubmit={handleUpdateConsumable} />}
            {showDeleteModal && selectedConsumable && <DeleteConsumableDialog consumable={selectedConsumable} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteConsumable} />}
            {showAssignModal && selectedConsumable && <AssignConsumableDialog consumable={selectedConsumable} onClose={() => setShowAssignModal(false)} onSubmit={handleAssignConsumable} />}
        </div>
    );
}

// Assign Consumable Dialog
function AssignConsumableDialog({ consumable, onClose, onSubmit }) {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        hospital_id: '',
        consumable_id: consumable.id,
        quantity: '1',
        selling_price: consumable.unit_price || '',
        assigned_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.HOSPITALS);
                setHospitals(response.data.hospitals || []);
            } catch (error) {
                toast.error('Failed to load hospitals');
            } finally {
                setLoading(false);
            }
        };
        fetchHospitals();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.hospital_id || !formData.quantity || !formData.selling_price) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (parseInt(formData.quantity) > consumable.stock_quantity) {
            toast.error(`Quantity cannot exceed available stock (${consumable.stock_quantity})`);
            return;
        }
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Assign Stock</h2>
                        <p className="text-sm text-gray-600">{consumable.item_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Hospital</label>
                        {loading ? (
                            <div className="animate-pulse h-10 bg-gray-100 rounded-lg"></div>
                        ) : (
                            <CustomSelect
                                value={formData.hospital_id}
                                onChange={(val) => setFormData({ ...formData, hospital_id: val })}
                                options={hospitals.map(h => ({ value: h.id, label: h.name }))}
                                placeholder="Select Hospital"
                            />
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity (Max: {consumable.stock_quantity})
                            </label>
                            <input
                                type="text"
                                required
                                min="1"
                                max={consumable.stock_quantity}
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price (Per Unit)</label>
                            <input
                                type="text"
                                required
                                step="0.01"
                                value={formData.selling_price}
                                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Date</label>
                        <input
                            type="date"
                            required
                            value={formData.assigned_date}
                            onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-[#19ADB8] text-white rounded-xl hover:bg-[#17999f]"
                        >
                            Assign
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Add Consumable Dialog
function AddConsumableDialog({ categories, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        item_name: '', category: 'Surgical', manufacturer: '', sku: '', unit: '',
        unit_price: '', stock_quantity: '', reorder_level: '10', monthly_usage: '',
        expiry_date: '', batch_number: '', storage_location: '', description: '',
        suppliers: '', image_url: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleImageChange = (file) => {
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size exceeds 5MB limit');
                return;
            }
            setImageFile(file);

            // Use FileReader for reliable preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageChange(e.dataTransfer.files[0]);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        updateField('image_url', '');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.item_name || !formData.sku || !formData.unit) {
            toast.error('Please fill in all required fields');
            return;
        }

        let finalImageUrl = formData.image_url;

        // Upload image if file is selected
        if (imageFile) {
            setUploading(true);
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('image', imageFile);
                const response = await axios.post('/api/v1/consumables/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (response.data.success) {
                    finalImageUrl = response.data.imageUrl;
                } else {
                    toast.error(response.data.error || 'Failed to upload image');
                    setUploading(false);
                    return;
                }
            } catch (error) {
                toast.error('Failed to upload image');
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        onSubmit({ ...formData, image_url: finalImageUrl });
    };

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white px-6 py-5 border-b flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Add Consumable</h2>
                        <p className="text-sm text-gray-600 mt-1">Add a new consumable item to your inventory</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Item Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.item_name}
                                onChange={(e) => updateField('item_name', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., Surgical Gloves Latex"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect
                                value={formData.category}
                                onChange={(value) => updateField('category', value)}
                                options={categories.map(c => ({ value: c, label: c }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Manufacturer <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.manufacturer}
                                onChange={(e) => updateField('manufacturer', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., Ansell"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                SKU <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.sku}
                                onChange={(e) => updateField('sku', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., ANS-GLV-7.5"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Unit <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.unit}
                                onChange={(e) => updateField('unit', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., box, piece, pack"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Unit Price (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.unit_price}
                                onChange={(e) => updateField('unit_price', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Stock Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.stock_quantity}
                                onChange={(e) => updateField('stock_quantity', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reorder Level <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.reorder_level}
                                onChange={(e) => updateField('reorder_level', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="10"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monthly Usage <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.monthly_usage}
                                onChange={(e) => updateField('monthly_usage', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                            <input
                                type="date"
                                value={formData.expiry_date}
                                onChange={(e) => updateField('expiry_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                            <input
                                type="text"
                                value={formData.batch_number}
                                onChange={(e) => updateField('batch_number', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., BN2024001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Storage Location <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.storage_location}
                                onChange={(e) => updateField('storage_location', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., Warehouse A - Shelf 12"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.description}
                                required
                                onChange={(e) => updateField('description', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                rows={2}
                                placeholder="Item description"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Suppliers (comma-separated) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.suppliers}
                                onChange={(e) => updateField('suppliers', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., Supplier A, Supplier B"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                            {imagePreview ? (
                                <div className="relative h-32 w-full">
                                    <Image src={imagePreview} alt="Preview" fill className="object-cover rounded-lg border border-gray-300" unoptimized />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragActive ? 'border-[#19ADB8] bg-[#19ADB8]/5' : 'border-gray-300 hover:border-[#19ADB8]'
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                handleImageChange(e.target.files[0]);
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <Package className="mx-auto text-gray-400 mb-2" size={32} />
                                    <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
                                    <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF (max 5MB)</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium text-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="flex-1 px-6 py-3 bg-[#19ADB8] hover:bg-[#17999f] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Uploading...' : 'Add Consumable'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Edit Consumable Dialog
function EditConsumableDialog({ consumable, categories, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        id: consumable.id,
        item_name: consumable.item_name || '',
        category: consumable.category || 'Other',
        manufacturer: consumable.manufacturer || '',
        sku: consumable.sku || '',
        unit: consumable.unit || '',
        unit_price: consumable.unit_price || '',
        stock_quantity: consumable.stock_quantity || '',
        reorder_level: consumable.reorder_level || '10',
        monthly_usage: consumable.monthly_usage || '',
        expiry_date: consumable.expiry_date?.split('T')[0] || '',
        batch_number: consumable.batch_number || '',
        storage_location: consumable.storage_location || '',
        description: consumable.description || '',
        suppliers: consumable.suppliers || '',
        image_url: consumable.image_url || ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(consumable.image_url || null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleImageChange = (file) => {
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size exceeds 5MB limit');
                return;
            }
            setImageFile(file);

            // Use FileReader for reliable preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageChange(e.dataTransfer.files[0]);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        updateField('image_url', '');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let finalImageUrl = formData.image_url;

        // Upload new image if file is selected
        if (imageFile) {
            setUploading(true);
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('image', imageFile);
                uploadFormData.append('consumableId', consumable.id);
                const response = await axios.post('/api/v1/consumables/upload', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (response.data.success) {
                    finalImageUrl = response.data.imageUrl;
                } else {
                    toast.error(response.data.error || 'Failed to upload image');
                    setUploading(false);
                    return;
                }
            } catch (error) {
                toast.error('Failed to upload image');
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        onSubmit({ ...formData, image_url: finalImageUrl });
    };

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white px-6 py-5 border-b flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Edit Consumable</h2>
                        <p className="text-sm text-gray-600 mt-1">{consumable.sku}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                            <input type="text" value={formData.item_name} onChange={(e) => updateField('item_name', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <CustomSelect value={formData.category} onChange={(value) => updateField('category', value)} options={categories.map(c => ({ value: c, label: c }))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
                            <input type="text" value={formData.manufacturer} onChange={(e) => updateField('manufacturer', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                            <input type="text" value={formData.sku} onChange={(e) => updateField('sku', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                            <input type="text" value={formData.unit} onChange={(e) => updateField('unit', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (₹)</label>
                            <input type="text" value={formData.unit_price} onChange={(e) => updateField('unit_price', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                            <input type="text" value={formData.stock_quantity} onChange={(e) => updateField('stock_quantity', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Level</label>
                            <input type="text" value={formData.reorder_level} onChange={(e) => updateField('reorder_level', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Usage</label>
                            <input type="text" value={formData.monthly_usage} onChange={(e) => updateField('monthly_usage', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                            <input type="date" value={formData.expiry_date} onChange={(e) => updateField('expiry_date', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                            <input type="text" value={formData.batch_number} onChange={(e) => updateField('batch_number', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Storage Location</label>
                            <input type="text" value={formData.storage_location} onChange={(e) => updateField('storage_location', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" rows={2} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Suppliers</label>
                            <input type="text" value={formData.suppliers} onChange={(e) => updateField('suppliers', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                            {imagePreview ? (
                                <div className="relative h-32 w-full">
                                    <Image src={imagePreview} alt="Preview" fill className="object-cover rounded-lg border border-gray-300" unoptimized />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragActive ? 'border-[#19ADB8] bg-[#19ADB8]/5' : 'border-gray-300 hover:border-[#19ADB8]'
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                handleImageChange(e.target.files[0]);
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <Package className="mx-auto text-gray-400 mb-2" size={32} />
                                    <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
                                    <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF (max 5MB)</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium text-gray-700">Cancel</button>
                        <button type="submit" disabled={uploading} className="flex-1 px-6 py-3 bg-[#19ADB8] hover:bg-[#17999f] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 disabled:opacity-50 disabled:cursor-not-allowed">
                            {uploading ? 'Uploading...' : 'Update Consumable'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Delete Consumable Dialog
function DeleteConsumableDialog({ consumable, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="text-red-600" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Consumable</h2>
                    <p className="text-gray-600 mb-6">
                        Are you sure you want to delete <strong>{consumable.item_name}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium text-gray-700">Cancel</button>
                        <button onClick={onConfirm} className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
