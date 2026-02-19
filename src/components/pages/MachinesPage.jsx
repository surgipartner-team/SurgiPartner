'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Search, Package, TrendingUp, ShoppingCart, Box, Activity, Plus, Edit2, Trash2, X } from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';


export default function MachinesPage() {
    const router = useRouter();
    const { can, user } = usePermissions();
    const [machines, setMachines] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [hospitals, setHospitals] = useState([]);

    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const response = await axios.get(`${API_ENDPOINTS.HOSPITALS}?status=active`);
                setHospitals(response.data.hospitals || []);
            } catch (error) {
                console.error('Error fetching hospitals:', error);
            }
        };
        fetchHospitals();
    }, []);

    const fetchMachines = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (searchQuery) params.append('search', searchQuery);
            const response = await axios.get(`${API_ENDPOINTS.MACHINES}?${params.toString()}`);
            setMachines(response.data.machines || []);
            setStats(response.data.stats || {});
        } catch (error) {
            toast.error('Error fetching machines');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, categoryFilter, searchQuery]);

    /* checkAuth and redundant duplicate useEffect have been removed */
    useEffect(() => { if (user) fetchMachines(); }, [user, fetchMachines]);

    const handleAddMachine = async (formData) => {
        try {
            await axios.post(API_ENDPOINTS.MACHINES, formData);
            fetchMachines();
            setShowAddModal(false);
            toast.success('Machine added successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error adding machine');
        }
    };

    const handleUpdateMachine = async (updates) => {
        try {
            await axios.put(API_ENDPOINTS.MACHINES, updates);
            fetchMachines();
            setShowEditModal(false);
            setSelectedMachine(null);
            toast.success('Machine updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating machine');
        }
    };

    const handleDeleteMachine = async () => {
        if (!selectedMachine) return;
        try {
            await axios.delete(`${API_ENDPOINTS.MACHINES}?id=${selectedMachine.id}`);
            fetchMachines();
            setShowDeleteModal(false);
            setSelectedMachine(null);
            toast.success('Machine deleted successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting machine');
        }
    };

    const uniqueCategories = [...new Set(machines.map(m => m.category).filter(Boolean))];
    const formatCurrency = (val) => val ? `₹${Number(val).toLocaleString('en-IN')}` : '-';
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    const getStatusBadge = (status) => {
        const styles = {
            'available': 'bg-green-50 text-green-700 border border-green-200',
            'rented': 'bg-blue-50 text-blue-700 border border-blue-200',
            'sold': 'bg-purple-50 text-purple-700 border border-purple-200',
            'maintenance': 'bg-amber-50 text-amber-700 border border-amber-200'
        };
        return styles[status?.toLowerCase()] || 'bg-gray-50 text-gray-700 border border-gray-200';
    };

    const getTypeBadge = (type) => {
        return type === 'For Sale'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-cyan-50 text-cyan-700 border border-cyan-200';
    };

    if (loading && !machines.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading machines...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header with Add Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory</h1>
                    <p className="text-gray-600">{machines.length} machines in inventory</p>
                </div>
                {can('machines', 'create') && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 transition-all"
                    >
                        <Plus size={20} />
                        Add Machine
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                            <Box className="text-[#004071]" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.total || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Total Inventory</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Activity className="text-green-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.available_count || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Available</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="text-blue-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">₹76.5L</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Rental Revenue</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <ShoppingCart className="text-purple-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.sold_count || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Units Sold</h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search machines by name, model, or serial number..."
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
                    <div className="w-full md:w-48">
                        <CustomSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "all", label: "All Statuses" },
                                { value: "Available", label: "Available" },
                                { value: "Rented", label: "Rented" },
                                { value: "Sold", label: "Sold" },
                                { value: "Maintenance", label: "Maintenance" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Machine Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {machines.map((machine) => (
                    <div
                        key={machine.id}
                        className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-[#19ADB8] hover:shadow-[#19ADB8] overflow-hidden group"
                    >
                        {/* Card Header with Icon */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-start justify-between mb-1">
                                <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center shadow-sm overflow-hidden border border-gray-100">
                                    {machine.image_url ? (
                                        <img src={machine.image_url} alt={machine.machine_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="text-[#004071]" size={28} />
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {can('machines', 'edit') && (
                                        <button
                                            onClick={() => { setSelectedMachine(machine); setShowEditModal(true); }}
                                            className="p-2 bg-white rounded-lg hover:bg-gray-50 text-gray-600 hover:text-[#004071]"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    {can('machines', 'delete') && (
                                        <button
                                            onClick={() => { setSelectedMachine(machine); setShowDeleteModal(true); }}
                                            className="p-2 bg-white rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-gray-900 text-md mb-1 truncate">
                                    {machine.machine_name}
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    {machine.manufacturer} - {machine.model_number}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(machine.status)}`}>
                                    {machine.status}
                                </span>
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeBadge(machine.type)}`}>
                                    {machine.type === 'For Sale' ? 'sale' : 'rental'}
                                </span>
                            </div>
                            <div className='mt-3'>
                                {/* Category Badge */}
                                <div className="inline-flex items-center px-3 py-1 bg-gray-50 mb-1 rounded-lg">
                                    <span className="text-xs font-medium text-gray-600">{machine.category}</span>
                                </div>

                                {/* Location & ID */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{machine.location || 'Telangana'}</span>
                                    </div>
                                    <div className="flex items-center text-gray-500">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                        </svg>
                                        <span className="text-xs">SN: {machine.serial_number}</span>
                                    </div>
                                    {machine.status === 'Rented' && machine.clinic_name && (
                                        <div className="flex items-center text-[#004071]">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span className="text-xs font-medium">{machine.clinic_name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Key Specifications */}
                                {machine.specifications && (
                                    <div className="rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-teal-900 mb-2">Key Specifications</h4>
                                        <ul className="space-y-1">
                                            {machine.specifications.split('\n').slice(0, 6).map((spec, idx) => (
                                                <li key={idx} className="text-xs text-gray-500 flex items-start">
                                                    <span className="text-teal-400 mr-2">•</span>
                                                    <span>{spec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="border-t border-gray-100">
                                    {machine.type === 'For Sale' ? (
                                        <div className="bg-emerald-50 rounded-xl p-1">
                                            <div className="text-md text-emerald-600 mb-1">Sale Price</div>
                                            <div className="text-md font-bold text-emerald-900">
                                                {formatCurrency(machine.sale_price)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 rounded-xl p-1">
                                            <div className="text-md text-blue-600 mb-1">Rental/Day</div>
                                            <div className="text-md font-bold text-blue-900">
                                                {formatCurrency(machine.rental_price)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                                <div className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Next: {formatDate(machine.next_Maintenance_date)}</span>
                                </div>
                                <div className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{machine.Manufacturing_year || '2023'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {machines.length === 0 && !loading && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No machines found</h3>
                    <p className="text-gray-600 mb-4">
                        {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Add your first machine to get started'}
                    </p>
                    {can('machines', 'create') && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium"
                        >
                            <Plus size={20} />
                            Add Your First Machine
                        </button>
                    )}
                </div>
            )}

            {/* Modals */}
            {showAddModal && <AddMachineDialog onClose={() => setShowAddModal(false)} onSubmit={handleAddMachine} hospitals={hospitals} />}
            {showEditModal && selectedMachine && <EditMachineDialog machine={selectedMachine} onClose={() => setShowEditModal(false)} onSubmit={handleUpdateMachine} hospitals={hospitals} />}
            {showDeleteModal && selectedMachine && <DeleteMachineDialog machine={selectedMachine} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteMachine} />}
        </div>
    );
}

// Add Machine Dialog
function AddMachineDialog({ onClose, onSubmit, hospitals }) {
    const [formData, setFormData] = useState({
        machine_name: '', machine_id: '', manufacturer: '', model_number: '', serial_number: '',
        type: 'For Rental', category: '', status: 'Available', location: '',
        purchase_date: '', purchase_price: '', sale_price: '', rental_price: '',
        rental_start_date: '', rental_end_date: '',
        Manufacturing_year: '', warranty_start_date: '', warranty_expiry: '',
        last_Maintenance_date: '', next_Maintenance_date: '', specifications: '',
        assigned_hospitals_id: '', image_url: ''
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
        if (!formData.machine_name || !formData.manufacturer || !formData.model_number || !formData.serial_number || !formData.category) {
            toast.error('Please fill in all required fields');
            return;
        }

        let finalImageUrl = formData.image_url;

        if (imageFile) {
            setUploading(true);
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('image', imageFile);
                const response = await axios.post('/api/v1/machines/upload', uploadFormData, {
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
                <div className="sticky top-0 bg-white px-6 py-5 border-b flex items-center justify-between z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Add New Machine</h2>
                        <p className="text-sm text-gray-600 mt-1">Enter the machine details below</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Image Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Machine Image</label>
                        {imagePreview ? (
                            <div className="relative w-full h-48">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg border border-gray-300 bg-gray-50" />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
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
                                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragActive ? 'border-[#19ADB8] bg-[#19ADB8]/5' : 'border-gray-300 hover:border-[#19ADB8]'
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
                                <div className="flex flex-col items-center">
                                    <Package className="text-gray-400 mb-3" size={48} />
                                    <p className="text-sm font-medium text-gray-700">Drag & drop or click to upload</p>
                                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP, GIF (max 5MB)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Machine Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.machine_name}
                                onChange={(e) => updateField('machine_name', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., MRI Scanner"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Machine ID
                            </label>
                            <input
                                type="text"
                                value={formData.machine_id}
                                onChange={(e) => updateField('machine_id', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., MCH-001 (Auto-generated if empty)"
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
                                placeholder="e.g., Siemens"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Model Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.model_number}
                                onChange={(e) => updateField('model_number', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Model Number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Serial Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.serial_number}
                                onChange={(e) => updateField('serial_number', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Serial Number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect
                                value={formData.category}
                                onChange={(value) => updateField('category', value)}
                                placeholder="Select Category"
                                options={[
                                    { value: "Lasik", label: "Lasik" },
                                    { value: "Cataract", label: "Cataract" },
                                    { value: "Orthopedic", label: "Orthopedic" },
                                    { value: "Hip Replacement", label: "Hip Replacement" },
                                    { value: "KneeReplacement", label: "Knee Replacement" },
                                    { value: "Acl Injury", label: "ACL Injury" },
                                    { value: "VaricoseVeins", label: "Varicose Veins" },
                                    { value: "Hernia", label: "Hernia" },
                                    { value: "Piles", label: "Piles" },
                                    { value: "Fissure", label: "Fissure" },
                                    { value: "Fistula", label: "Fistula" },
                                    { value: "Circumcision", label: "Circumcision" },
                                    { value: "Lipoma", label: "Lipoma" },
                                    { value: "Diagnostic Services", label: "Diagnostic Services" },
                                    { value: "Septoplasty", label: "Septoplasty" },
                                    { value: "Sinusitis", label: "Sinusitis" },
                                    { value: "Neurology", label: "Neurology" },
                                    { value: "Gallstones", label: "Gallstones" },
                                    { value: "Cosmetology", label: "Cosmetology" },
                                    { value: "Gynecology", label: "Gynecology" },
                                    { value: "ENT", label: "ENT" },
                                    { value: "Uterine Fibroids", label: "Uterine Fibroids" },
                                    { value: "Breast Lumps", label: "Breast Lumps" },
                                    { value: "Hydrocele", label: "Hydrocele" },
                                    { value: "Thyroid Ablation", label: "Thyroid Ablation" },
                                    { value: "Arthroscopy", label: "Arthroscopy" },
                                    { value: "Varicocele", label: "Varicocele" },
                                    { value: "Inguinal Hernia", label: "Inguinal Hernia" },
                                    { value: "Cardiac", label: "Cardiac" },
                                    { value: "Rhinoplasty", label: "Rhinoplasty" },
                                    { value: "Liposuction", label: "Liposuction" },
                                    { value: "Hair Transplant", label: "Hair Transplant" },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                            <CustomSelect
                                value={formData.type}
                                onChange={(value) => updateField('type', value)}
                                placeholder="Select Type"
                                options={[
                                    { value: "For Rental", label: "For Rental" },
                                    { value: "For Sale", label: "For Sale" },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <CustomSelect
                                value={formData.status}
                                onChange={(value) => updateField('status', value)}
                                placeholder="Select Status"
                                options={[
                                    { value: "Available", label: "Available" },
                                    { value: "Rented", label: "Rented" },
                                    { value: "Sold", label: "Sold" },
                                    { value: "Maintenance", label: "Maintenance" },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => updateField('location', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Hyderabad"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Hospital (Optional)</label>
                            <CustomSelect
                                value={formData.assigned_hospitals_id}
                                onChange={(value) => updateField('assigned_hospitals_id', value)}
                                placeholder="Select Hospital"
                                options={hospitals.map(h => ({ value: h.id, label: h.name }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturing Year</label>
                            <input
                                type="text"
                                value={formData.Manufacturing_year}
                                onChange={(e) => updateField('Manufacturing_year', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="2023"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                            <input
                                type="date"
                                value={formData.purchase_date}
                                onChange={(e) => updateField('purchase_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price (₹)</label>
                            <input
                                type="text"
                                value={formData.purchase_price}
                                onChange={(e) => updateField('purchase_price', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
                            <input
                                type="text"
                                value={formData.sale_price}
                                onChange={(e) => updateField('sale_price', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rental Price (₹/month)</label>
                            <input
                                type="text"
                                value={formData.rental_price}
                                onChange={(e) => updateField('rental_price', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rental Start Date</label>
                            <input
                                type="date"
                                value={formData.rental_start_date}
                                onChange={(e) => updateField('rental_start_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rental End Date</label>
                            <input
                                type="date"
                                value={formData.rental_end_date}
                                onChange={(e) => updateField('rental_end_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Start</label>
                            <input
                                type="date"
                                value={formData.warranty_start_date}
                                onChange={(e) => updateField('warranty_start_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Expiry</label>
                            <input
                                type="date"
                                value={formData.warranty_expiry}
                                onChange={(e) => updateField('warranty_expiry', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Maintenance</label>
                            <input
                                type="date"
                                value={formData.last_Maintenance_date}
                                onChange={(e) => updateField('last_Maintenance_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Next Maintenance</label>
                            <input
                                type="date"
                                value={formData.next_Maintenance_date}
                                onChange={(e) => updateField('next_Maintenance_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                        <textarea
                            value={formData.specifications}
                            onChange={(e) => updateField('specifications', e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            rows={4}
                            placeholder="Enter technical specifications (one per line)"
                        />
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
                            className="flex-1 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Uploading...' : 'Add Machine'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Edit Machine Dialog
function EditMachineDialog({ machine, onClose, onSubmit, hospitals }) {
    const [formData, setFormData] = useState({
        id: machine.id,
        id: machine.id,
        machine_name: machine.machine_name || '',
        machine_id: machine.machine_id || '',
        manufacturer: machine.manufacturer || '',
        model_number: machine.model_number || '',
        serial_number: machine.serial_number || '',
        type: machine.type || 'For Rental',
        category: machine.category || '',
        status: machine.status || 'Available',
        purchase_price: machine.purchase_price || '',
        sale_price: machine.sale_price || '',
        rental_price: machine.rental_price || '',
        rental_start_date: machine.rental_start_date || '',
        rental_end_date: machine.rental_end_date || '',
        Manufacturing_year: machine.Manufacturing_year || '',
        warranty_start_date: machine.warranty_start_date || '',
        warranty_expiry: machine.warranty_expiry || '',
        last_Maintenance_date: machine.last_Maintenance_date || '',
        next_Maintenance_date: machine.next_Maintenance_date || '',
        specifications: machine.specifications || '',
        assigned_hospitals_id: machine.assigned_hospitals_id || '',
        image_url: machine.image_url || ''
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(machine.image_url || null);
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
        if (!formData.machine_name || !formData.manufacturer || !formData.model_number || !formData.serial_number || !formData.category) {
            toast.error('Please fill in all required fields');
            return;
        }

        let finalImageUrl = formData.image_url;

        if (imageFile) {
            setUploading(true);
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('image', imageFile);
                const response = await axios.post('/api/v1/machines/upload', uploadFormData, {
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
                <div className="sticky top-0 bg-white px-6 py-5 border-b flex items-center justify-between z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Edit Machine</h2>
                        <p className="text-sm text-gray-600 mt-1">{machine.machine_id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Image Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Machine Image</label>
                        {imagePreview ? (
                            <div className="relative w-full h-48">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg border border-gray-300 bg-gray-50" />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
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
                                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragActive ? 'border-[#19ADB8] bg-[#19ADB8]/5' : 'border-gray-300 hover:border-[#19ADB8]'
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
                                <div className="flex flex-col items-center">
                                    <Package className="text-gray-400 mb-3" size={48} />
                                    <p className="text-sm font-medium text-gray-700">Drag & drop or click to upload</p>
                                    <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP, GIF (max 5MB)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Machine Name</label>
                            <input
                                type="text"
                                value={formData.machine_name}
                                onChange={(e) => updateField('machine_name', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Machine ID</label>
                            <input
                                type="text"
                                value={formData.machine_id}
                                onChange={(e) => updateField('machine_id', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Machine ID"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
                            <input
                                type="text"
                                value={formData.manufacturer}
                                onChange={(e) => updateField('manufacturer', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Model Number</label>
                            <input
                                type="text"
                                value={formData.model_number}
                                onChange={(e) => updateField('model_number', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
                            <input
                                type="text"
                                value={formData.serial_number}
                                onChange={(e) => updateField('serial_number', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => updateField('category', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                            <CustomSelect
                                value={formData.type}
                                onChange={(val) => updateField('type', val)}
                                options={[
                                    { value: 'For Rental', label: 'For Rental' },
                                    { value: 'For Sale', label: 'For Sale' }
                                ]}
                                placeholder="Select Type"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                            <CustomSelect
                                value={formData.status}
                                onChange={(val) => updateField('status', val)}
                                options={[
                                    { value: 'Available', label: 'Available' },
                                    { value: 'Rented', label: 'Rented' },
                                    { value: 'Sold', label: 'Sold' },
                                    { value: 'Maintenance', label: 'Maintenance' }
                                ]}
                                placeholder="Select Status"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Hospital (Optional)</label>
                            <CustomSelect
                                value={formData.assigned_hospitals_id}
                                onChange={(value) => updateField('assigned_hospitals_id', value)}
                                placeholder="Select Hospital"
                                options={hospitals.map(h => ({ value: h.id, label: h.name }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturing Year</label>
                            <input
                                type="text"
                                value={formData.Manufacturing_year}
                                onChange={(e) => updateField('Manufacturing_year', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price (₹)</label>
                            <input
                                type="text"
                                value={formData.purchase_price}
                                onChange={(e) => updateField('purchase_price', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
                            <input
                                type="text"
                                value={formData.sale_price}
                                onChange={(e) => updateField('sale_price', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rental Price (₹/month)</label>
                            <input
                                type="text"
                                value={formData.rental_price}
                                onChange={(e) => updateField('rental_price', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rental Start Date</label>
                            <input
                                type="date"
                                value={formData.rental_start_date}
                                onChange={(e) => updateField('rental_start_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rental End Date</label>
                            <input
                                type="date"
                                value={formData.rental_end_date}
                                onChange={(e) => updateField('rental_end_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Start</label>
                            <input
                                type="date"
                                value={formData.warranty_start_date}
                                onChange={(e) => updateField('warranty_start_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Expiry</label>
                            <input
                                type="date"
                                value={formData.warranty_expiry}
                                onChange={(e) => updateField('warranty_expiry', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Maintenance</label>
                            <input
                                type="date"
                                value={formData.last_Maintenance_date}
                                onChange={(e) => updateField('last_Maintenance_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Next Maintenance</label>
                            <input
                                type="date"
                                value={formData.next_Maintenance_date}
                                onChange={(e) => updateField('next_Maintenance_date', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                        <textarea
                            value={formData.specifications}
                            onChange={(e) => updateField('specifications', e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            rows={4}
                        />
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
                            className="flex-1 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Delete Machine Dialog
function DeleteMachineDialog({ machine, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                        <Trash2 className="text-red-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Delete Machine</h2>
                        <p className="text-sm text-gray-500">{machine.machine_id}</p>
                    </div>
                </div>
                <p className="text-gray-700 mb-4">
                    Are you sure you want to delete <strong>{machine.machine_name}</strong>?
                </p>
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                    <p className="text-sm text-red-800 flex items-start gap-2">
                        <span>This action cannot be undone. All associated data will be permanently deleted.</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}