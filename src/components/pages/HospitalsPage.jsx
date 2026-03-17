'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Search, Building2, TrendingUp, Activity, Plus, Edit2, Trash2, X, MapPin, Phone, Mail, User2Icon, Award, Percent, Upload, Camera } from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';

export default function HospitalsPage() {
    const router = useRouter();
    const { can, user } = usePermissions();
    const [hospitals, setHospitals] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [partnershipStatusFilter, setPartnershipStatusFilter] = useState('all');
    const [hospitalTypeFilter, setHospitalTypeFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);

    const fetchHospitals = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (partnershipStatusFilter !== 'all') params.append('partnership_status', partnershipStatusFilter);
            if (hospitalTypeFilter !== 'all') params.append('hospital_type', hospitalTypeFilter);
            if (searchQuery) params.append('search', searchQuery);
            const response = await axios.get(`${API_ENDPOINTS.HOSPITALS}?${params.toString()}`);
            setHospitals(response.data.hospitals || []);
            setStats(response.data.stats || {});
        } catch (error) {
            toast.error('Error fetching hospitals');
        } finally {
            setLoading(false);
        }
    }, [partnershipStatusFilter, hospitalTypeFilter, searchQuery]);

    /* checkAuth and redundant duplicate useEffect have been removed */
    useEffect(() => { if (user) fetchHospitals(); }, [user, fetchHospitals]);

    const handleAddHospital = async (formData) => {
        try {
            await axios.post(API_ENDPOINTS.HOSPITALS, formData);
            fetchHospitals();
            setShowAddModal(false);
            toast.success('Hospital added successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error adding hospital');
        }
    };

    const handleUpdateHospital = async (updates) => {
        try {
            await axios.put(API_ENDPOINTS.HOSPITALS, updates);
            fetchHospitals();
            setShowEditModal(false);
            setSelectedHospital(null);
            toast.success('Hospital updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating hospital');
        }
    };

    const handleDeleteHospital = async () => {
        if (!selectedHospital) return;
        try {
            await axios.delete(`${API_ENDPOINTS.HOSPITALS}?id=${selectedHospital.id}`);
            fetchHospitals();
            setShowDeleteModal(false);
            setSelectedHospital(null);
            toast.success('Hospital deleted successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting hospital');
        }
    };

    const uniqueHospitalTypes = [...new Set(hospitals.map(h => h.hospital_type).filter(Boolean))];
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    const getStatusBadge = (status) => {
        const styles = {
            'active': 'bg-green-50 text-green-700 border border-green-200',
            'pending': 'bg-amber-50 text-amber-700 border border-amber-200',
            'inactive': 'bg-gray-50 text-gray-700 border border-gray-200'
        };
        return styles[status?.toLowerCase()] || 'bg-gray-50 text-gray-700 border border-gray-200';
    };

    if (loading && !hospitals.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading Hospitals...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header with Add Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Hospitals</h1>
                    <p className="text-gray-600">{hospitals.length} hospitals</p>
                </div>
                {can('hospitals', 'create') && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 transition-all w-full md:w-auto"
                    >
                        <Plus size={20} />
                        Add Hospital
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 p-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                            <Building2 className="text-[#004071]" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Total Hospitals</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats?.total || 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 p-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                            <Activity className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Active Partners</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats?.active_count || 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 p-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                            <Award className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Total Cases</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats?.total_cases ? Number(stats.total_cases).toLocaleString() : 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 p-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                            <Percent className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Avg Commission</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {stats?.avg_commission ? Number(stats.avg_commission).toFixed(1) : '0'}%
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search hospitals by name, phone, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <CustomSelect
                            value={hospitalTypeFilter}
                            onChange={setHospitalTypeFilter}
                            options={[
                                { value: "all", label: "All Hospital Types" },
                                ...uniqueHospitalTypes.map(t => ({ value: t, label: t }))
                            ]}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <CustomSelect
                            value={partnershipStatusFilter}
                            onChange={setPartnershipStatusFilter}
                            options={[
                                { value: "all", label: "All Statuses" },
                                { value: "Active", label: "Active" },
                                { value: "Pending", label: "Pending" },
                                { value: "Inactive", label: "Inactive" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Hospital Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {hospitals.map((hospital) => (
                    <div
                        key={hospital.id}
                        className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-[#19ADB8] hover:shadow-[#19ADB8] overflow-hidden group cursor-pointer"
                        onClick={(e) => {
                            // Prevent navigation if clicking on action buttons
                            if (e.target.closest('button')) return;
                            router.push(`/admin/hospitals/${hospital.id}`);
                        }}
                    >
                        {/* Card Header */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl shadow-sm ">
                                        <Building2 className="text-[#004071]" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            {hospital.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-600">
                                                {hospital.hospital_type}
                                            </p>
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(hospital.partnership_status)}`}>
                                                {hospital.partnership_status}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    {can('hospitals', 'edit') && (
                                        <button
                                            onClick={() => { setSelectedHospital(hospital); setShowEditModal(true); }}
                                            className="p-2 bg-white rounded-lg hover:bg-gray-50 text-gray-600 hover:text-[#004071]"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    {can('hospitals', 'delete') && (
                                        <button
                                            onClick={() => { setSelectedHospital(hospital); setShowDeleteModal(true); }}
                                            className="p-2 bg-white rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Contact Information */}
                                <div className="space-y-2">
                                    <div className="flex items-center text-gray-600 text-sm">
                                        <MapPin className="w-4 h-4 mr-2 text-[#004071]" />
                                        <span>{hospital?.address}, {hospital?.city}, {hospital?.state}, {hospital?.country}, {hospital?.pin_code}</span>
                                    </div>
                                    {hospital.phone && (
                                        <div className="flex items-center text-gray-600 text-sm">
                                            <Phone className="w-4 h-4 mr-2 text-[#004071]" />
                                            <span>{hospital.phone}</span>
                                        </div>
                                    )}
                                    {hospital.email && (
                                        <div className="flex items-center text-gray-600 text-sm">
                                            <Mail className="w-4 h-4 mr-2 text-[#004071]" />
                                            <span className="truncate">{hospital.email}</span>
                                        </div>
                                    )}
                                    {hospital.contact_person && (
                                        <div className="flex items-center text-gray-600 text-sm">
                                            <User2Icon className="w-4 h-4 mr-2 text-[#004071]" />
                                            <span className="truncate">{hospital.contact_person} - {hospital.contact_person_phone}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Hospital Details */}
                                {(hospital.total_beds || hospital.operation_theatres) && (
                                    <div className="bg-teal-50 rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {hospital.total_beds && (
                                                <div className="text-[#00335a]">
                                                    <span className="font-medium">Beds:</span> {hospital.total_beds}
                                                </div>
                                            )}
                                            {hospital.icu_beds && (
                                                <div className="text-[#00335a]">
                                                    <span className="font-medium">ICU:</span> {hospital.icu_beds}
                                                </div>
                                            )}
                                            {hospital.operation_theatres && (
                                                <div className="text-[#00335a]">
                                                    <span className="font-medium">OTs:</span> {hospital.operation_theatres}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium mb-1 block">Accreditations</label>
                                        <div className="flex flex-wrap gap-2">
                                            {hospital.accreditations ? (
                                                hospital.accreditations.split(',').map((acc, idx) => (
                                                    <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md text-xs font-semibold">
                                                        {acc.trim()}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No accreditations</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    {/* Cases Completed */}
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Cases Completed</div>
                                        <div className="text-lg font-bold text-gray-900">
                                            {hospital.cases_completed || 0}
                                        </div>
                                    </div>

                                    {/* Commission Rate */}
                                    {hospital.commission_rate && (
                                        <div className="text-right">
                                            <div className="text-xs text-blue-600 mb-1">Commission Rate</div>
                                            <div className="text-lg font-bold text-blue-900">
                                                {hospital.commission_rate}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {
                hospitals.length === 0 && !loading && (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No hospitals found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchQuery || partnershipStatusFilter !== 'all' || hospitalTypeFilter !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Add your first hospital to get started'}
                        </p>
                        {can('hospitals', 'create') && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium"
                            >
                                <Plus size={20} />
                                Add Your First Hospital
                            </button>
                        )}
                    </div>
                )
            }

            {/* Modals */}
            {showAddModal && <AddHospitalDialog onClose={() => setShowAddModal(false)} onSubmit={handleAddHospital} />}
            {showEditModal && selectedHospital && <EditHospitalDialog hospital={selectedHospital} onClose={() => setShowEditModal(false)} onSubmit={handleUpdateHospital} />}
            {showDeleteModal && selectedHospital && <DeleteHospitalDialog hospital={selectedHospital} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteHospital} />}
        </div>
    );
}

// Add Hospital Dialog
function AddHospitalDialog({ onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        name: '',
        hospital_type: '',
        city: '',
        address: '',
        state: '',
        pin_code: '',
        partnership_status: 'Active',
        country: 'India',
        phone: '',
        email: '',
        contact_person: '',
        contact_person_phone: '',
        operation_theatres: '',
        total_beds: '',
        icu_beds: '',
        commission_rate: '',
        accreditations: '',
        gst_number: '',
        bank_name: '',
        branch_name: '',
        ifsc_code: '',
        account_number: '',
        surgeons: []
    });

    const addSurgeon = () => {
        setFormData(prev => ({
            ...prev,
            surgeons: [...prev.surgeons, { name: '', phone: '', designation: '', department: '', experience: '', available_timings: '', image: '' }]
        }));
    };

    const removeSurgeon = (index) => {
        setFormData(prev => ({
            ...prev,
            surgeons: prev.surgeons.filter((_, i) => i !== index)
        }));
    };

    const updateSurgeon = (index, field, value) => {
        const newSurgeons = [...formData.surgeons];
        newSurgeons[index][field] = value;
        setFormData(prev => ({ ...prev, surgeons: newSurgeons }));
    };

    const handleSurgeonImageUpload = async (index, file) => {
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size exceeds 5MB limit');
            return;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('image', file);

        try {
            // Show loading state or toast could be handled here if needed
            const response = await axios.post('/api/v1/hospitals/upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                updateSurgeon(index, 'image', response.data.imageUrl);
                toast.success('Image uploaded successfully');
            } else {
                toast.error(response.data.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.hospital_type || !formData.address || !formData.phone || !formData.city || !formData.state || !formData.pin_code || !formData.email) {
            toast.error('Please fill in all required fields');
            return;
        }
        onSubmit(formData);
    };

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-6 py-5 border-b flex items-center justify-between z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Add New Hospital</h2>
                        <p className="text-sm text-gray-600 mt-1">Enter the hospital details below</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hospital Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="e.g., Apollo Hospital"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hospital Type <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect
                                value={formData.hospital_type}
                                onChange={(value) => updateField('hospital_type', value)}
                                placeholder="Select Type"
                                options={[
                                    { value: "Multi-Specialty", label: "Multi-Specialty" },
                                    { value: "Super-Specialty", label: "Super-Specialty" },
                                    { value: "General", label: "General" },
                                    { value: "Clinic", label: "Clinic" },
                                    { value: "Nursing Home", label: "Nursing Home" }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                GST Number
                            </label>
                            <input
                                type="text"
                                value={formData.gst_number}
                                onChange={(e) => updateField('gst_number', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="GSTIN"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bank Details
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => updateField('bank_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Bank Name"
                                />
                                <input
                                    type="text"
                                    value={formData.branch_name}
                                    onChange={(e) => updateField('branch_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Branch Name"
                                />
                                <input
                                    type="text"
                                    value={formData.ifsc_code}
                                    onChange={(e) => updateField('ifsc_code', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="IFSC Code"
                                />
                                <input
                                    type="text"
                                    value={formData.account_number}
                                    onChange={(e) => updateField('account_number', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Account Number"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                rows={2}
                                placeholder="Full address"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                City <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.city}
                                onChange={(e) => updateField('city', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="City"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                State <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.state}
                                onChange={(e) => updateField('state', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="State"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                PIN Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.pin_code}
                                onChange={(e) => updateField('pin_code', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="PIN Code"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Country <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.country}
                                onChange={(e) => updateField('country', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Country"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => updateField('phone', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Phone Number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Email Address"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contact_person}
                                onChange={(e) => updateField('contact_person', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Contact Person Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person Phone</label>
                            <input
                                type="tel"
                                value={formData.contact_person_phone}
                                onChange={(e) => updateField('contact_person_phone', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="Contact Person Phone"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Total Beds</label>
                            <input
                                type="text"
                                value={formData.total_beds}
                                onChange={(e) => updateField('total_beds', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ICU Beds</label>
                            <input
                                type="text"
                                value={formData.icu_beds}
                                onChange={(e) => updateField('icu_beds', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Operation Theatres</label>
                            <input
                                type="text"
                                value={formData.operation_theatres}
                                onChange={(e) => updateField('operation_theatres', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                            <input
                                type="text"
                                step="0.01"
                                value={formData.commission_rate}
                                onChange={(e) => updateField('commission_rate', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Partnership Status</label>
                            <CustomSelect
                                value={formData.partnership_status}
                                onChange={(value) => updateField('partnership_status', value)}
                                options={[
                                    { value: "Active", label: "Active" },
                                    { value: "Pending", label: "Pending" },
                                    { value: "Inactive", label: "Inactive" }
                                ]}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Accreditations (comma-separated)</label>
                        <input
                            type="text"
                            value={formData.accreditations}
                            onChange={(e) => updateField('accreditations', e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            placeholder="e.g., NABH, JCI, ISO"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Contact Surgeons</label>
                            <button type="button" onClick={addSurgeon} className="text-sm text-[#004071] hover:underline flex items-center gap-1">
                                <Plus size={16} /> Add Surgeon
                            </button>
                        </div>
                        <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            {formData.surgeons.length === 0 && <p className="text-sm text-gray-400 italic text-center">No surgeons added.</p>}
                            {formData.surgeons.map((surgeon, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Surgeon Name *"
                                            value={surgeon.name}
                                            onChange={(e) => updateSurgeon(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                            required
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Phone"
                                            value={surgeon.phone}
                                            onChange={(e) => updateSurgeon(index, 'phone', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Designation"
                                            value={surgeon.designation}
                                            onChange={(e) => updateSurgeon(index, 'designation', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Experience (e.g. 10 years)"
                                            value={surgeon.experience}
                                            onChange={(e) => updateSurgeon(index, 'experience', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <input
                                            type="text"
                                            placeholder="Department"
                                            value={surgeon.department}
                                            onChange={(e) => updateSurgeon(index, 'department', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Timings (e.g. Mon-Fri 10am-5pm)"
                                            value={surgeon.available_timings}
                                            onChange={(e) => updateSurgeon(index, 'available_timings', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                        <div className="flex gap-2 items-center">
                                            {surgeon.image ? (
                                                <div className="relative w-10 h-10 flex-shrink-0">
                                                    <Image src={surgeon.image} alt="Surgeon" fill className="object-cover rounded-lg border border-gray-200" unoptimized />
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSurgeon(index, 'image', '')}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative flex-grow">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                handleSurgeonImageUpload(index, e.target.files[0]);
                                                            }
                                                        }}
                                                        className="hidden"
                                                        id={`surgeon-image-${index}`}
                                                    />
                                                    <label
                                                        htmlFor={`surgeon-image-${index}`}
                                                        className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-500 cursor-pointer hover:border-[#19ADB8] hover:text-[#19ADB8] transition-colors"
                                                    >
                                                        <Camera size={16} />
                                                        <span>Upload Image</span>
                                                    </label>
                                                </div>
                                            )}
                                            <button type="button" onClick={() => removeSurgeon(index)} className="text-red-500 hover:text-red-700 p-2 ml-auto">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium text-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="w-full sm:flex-1 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30"
                        >
                            Add Hospital
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Edit Hospital Dialog
function EditHospitalDialog({ hospital, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        id: hospital.id,
        name: hospital.name || '',
        hospital_type: hospital.hospital_type || '',
        city: hospital.city || '',
        address: hospital.address || '',
        state: hospital.state || '',
        pin_code: hospital.pin_code || '',
        partnership_status: hospital.partnership_status || 'Active',
        country: hospital.country || 'India',
        phone: hospital.phone || '',
        email: hospital.email || '',
        contact_person: hospital.contact_person || '',
        contact_person_phone: hospital.contact_person_phone || '',
        operation_theatres: hospital.operation_theatres || '',
        total_beds: hospital.total_beds || '',
        icu_beds: hospital.icu_beds || '',
        commission_rate: hospital.commission_rate || '',
        accreditations: hospital.accreditations || '',
        gst_number: hospital.gst_number || '', // New field
        bank_name: hospital.bank_name || '',
        branch_name: hospital.branch_name || '',
        ifsc_code: hospital.ifsc_code || '',
        account_number: hospital.account_number || '',
        surgeons: hospital.surgeons ? hospital.surgeons.map(s => ({
            ...s,
            name: s.name || '',
            phone: s.phone || '',
            designation: s.designation || '',
            department: s.department || '',
            experience: s.experience || '',
            available_timings: s.available_timings || '',
            image: s.image || ''
        })) : []
    });

    const addSurgeon = () => {
        setFormData(prev => ({
            ...prev,
            surgeons: [...prev.surgeons, { name: '', phone: '', designation: '', department: '', experience: '', available_timings: '', image: '' }]
        }));
    };

    const removeSurgeon = (index) => {
        setFormData(prev => ({
            ...prev,
            surgeons: prev.surgeons.filter((_, i) => i !== index)
        }));
    };

    const updateSurgeon = (index, field, value) => {
        const newSurgeons = [...formData.surgeons];
        newSurgeons[index][field] = value;
        setFormData(prev => ({ ...prev, surgeons: newSurgeons }));
    };

    const handleSurgeonImageUpload = async (index, file) => {
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size exceeds 5MB limit');
            return;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('image', file);

        try {
            const response = await axios.post('/api/v1/hospitals/upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                updateSurgeon(index, 'image', response.data.imageUrl);
                toast.success('Image uploaded successfully');
            } else {
                toast.error(response.data.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-6 py-5 border-b flex items-center justify-between z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Edit Hospital</h2>
                        <p className="text-sm text-gray-600 mt-1">{hospital.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hospital Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hospital Type</label>
                            <CustomSelect
                                value={formData.hospital_type}
                                onChange={(value) => updateField('hospital_type', value)}
                                options={[
                                    { value: "Multi-Specialty", label: "Multi-Specialty" },
                                    { value: "Super-Specialty", label: "Super-Specialty" },
                                    { value: "General", label: "General" },
                                    { value: "Clinic", label: "Clinic" },
                                    { value: "Nursing Home", label: "Nursing Home" }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                GST Number
                            </label>
                            <input
                                type="text"
                                value={formData.gst_number}
                                onChange={(e) => updateField('gst_number', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                placeholder="GSTIN"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bank Details
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => updateField('bank_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Bank Name"
                                />
                                <input
                                    type="text"
                                    value={formData.branch_name}
                                    onChange={(e) => updateField('branch_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Branch Name"
                                />
                                <input
                                    type="text"
                                    value={formData.ifsc_code}
                                    onChange={(e) => updateField('ifsc_code', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="IFSC Code"
                                />
                                <input
                                    type="text"
                                    value={formData.account_number}
                                    onChange={(e) => updateField('account_number', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Account Number"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-2">Contact Person</h3>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => updateField('city', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                            <input
                                type="text"
                                value={formData.state}
                                onChange={(e) => updateField('state', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                            <input
                                type="text"
                                value={formData.pin_code}
                                onChange={(e) => updateField('pin_code', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                            <input
                                type="text"
                                value={formData.country}
                                onChange={(e) => updateField('country', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => updateField('phone', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contact_person}
                                onChange={(e) => updateField('contact_person', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person Phone</label>
                            <input
                                type="tel"
                                value={formData.contact_person_phone}
                                onChange={(e) => updateField('contact_person_phone', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Total Beds</label>
                            <input
                                type="text"
                                value={formData.total_beds}
                                onChange={(e) => updateField('total_beds', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">ICU Beds</label>
                            <input
                                type="text"
                                value={formData.icu_beds}
                                onChange={(e) => updateField('icu_beds', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Operation Theatres</label>
                            <input
                                type="text"
                                value={formData.operation_theatres}
                                onChange={(e) => updateField('operation_theatres', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                            <input
                                type="text"
                                step="0.01"
                                value={formData.commission_rate}
                                onChange={(e) => updateField('commission_rate', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Partnership Status</label>
                            <CustomSelect
                                value={formData.partnership_status}
                                onChange={(value) => updateField('partnership_status', value)}
                                options={[
                                    { value: "Active", label: "Active" },
                                    { value: "Pending", label: "Pending" },
                                    { value: "Inactive", label: "Inactive" }
                                ]}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Accreditations (comma-separated)</label>
                        <input
                            type="text"
                            value={formData.accreditations}
                            onChange={(e) => updateField('accreditations', e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            placeholder="e.g., NABH, JCI, ISO"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Contact Surgeons</label>
                            <button type="button" onClick={addSurgeon} className="text-sm text-[#004071] hover:underline flex items-center gap-1">
                                <Plus size={16} /> Add Surgeon
                            </button>
                        </div>
                        <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            {formData.surgeons.length === 0 && <p className="text-sm text-gray-400 italic text-center">No surgeons added.</p>}
                            {formData.surgeons.map((surgeon, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Surgeon Name *"
                                            value={surgeon.name}
                                            onChange={(e) => updateSurgeon(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                            required
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Phone"
                                            value={surgeon.phone}
                                            onChange={(e) => updateSurgeon(index, 'phone', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Designation"
                                            value={surgeon.designation}
                                            onChange={(e) => updateSurgeon(index, 'designation', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Experience (e.g. 10 years)"
                                            value={surgeon.experience}
                                            onChange={(e) => updateSurgeon(index, 'experience', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <input
                                            type="text"
                                            placeholder="Department"
                                            value={surgeon.department}
                                            onChange={(e) => updateSurgeon(index, 'department', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Timings (e.g. Mon-Fri 10am-5pm)"
                                            value={surgeon.available_timings}
                                            onChange={(e) => updateSurgeon(index, 'available_timings', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#19ADB8]"
                                        />
                                        <div className="flex gap-2 items-center">
                                            {surgeon.image ? (
                                                <div className="relative w-10 h-10 flex-shrink-0">
                                                    <Image src={surgeon.image} alt="Surgeon" fill className="object-cover rounded-lg border border-gray-200" unoptimized />
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSurgeon(index, 'image', '')}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative flex-grow">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                handleSurgeonImageUpload(index, e.target.files[0]);
                                                            }
                                                        }}
                                                        className="hidden"
                                                        id={`surgeon-image-${index}`}
                                                    />
                                                    <label
                                                        htmlFor={`surgeon-image-${index}`}
                                                        className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-500 cursor-pointer hover:border-[#19ADB8] hover:text-[#19ADB8] transition-colors"
                                                    >
                                                        <Camera size={16} />
                                                        <span>Upload Image</span>
                                                    </label>
                                                </div>
                                            )}
                                            <button type="button" onClick={() => removeSurgeon(index)} className="text-red-500 hover:text-red-700 p-2 ml-auto">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                            className="flex-1 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}

// Delete Hospital Dialog
function DeleteHospitalDialog({ hospital, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                        <Trash2 className="text-red-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Delete Hospital</h2>
                        <p className="text-sm text-gray-500">{hospital.name}</p>
                    </div>
                </div>
                <p className="text-gray-700 mb-4">
                    Are you sure you want to delete <strong>{hospital.name}</strong>?
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