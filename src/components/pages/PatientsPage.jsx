'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Search, Users, UserCheck, UserPlus, Calendar, Plus, Edit2, Trash2, X, Phone, Activity, Key } from 'lucide-react';
import CustomSelect from '@/components/layouts/CustomSelect';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';

export default function PatientsPage() {
    const router = useRouter();
    const { can, user } = usePermissions();
    const [patients, setPatients] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateLoginModal, setShowCreateLoginModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const fetchPatients = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (searchQuery) params.append('search', searchQuery);
            const response = await axios.get(`${API_ENDPOINTS.PATIENTS}?${params.toString()}`);
            setPatients(response.data.patients || []);
            setStats(response.data.stats || {});
        } catch (error) {
            toast.error('Error fetching patients');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchQuery]);

    /* checkAuth and redundant duplicate useEffect have been removed */
    useEffect(() => { if (user) fetchPatients(); }, [user, fetchPatients]);

    const handleAddPatient = async (formData) => {
        try {
            await axios.post(API_ENDPOINTS.PATIENTS, formData);
            fetchPatients();
            setShowAddModal(false);
            toast.success('Patient added successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error adding patient');
        }
    };

    const handleUpdatePatient = async (updates) => {
        try {
            await axios.put(API_ENDPOINTS.PATIENTS, updates);
            fetchPatients();
            setShowEditModal(false);
            setSelectedPatient(null);
            toast.success('Patient updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating patient');
        }
    };

    const handleDeletePatient = async () => {
        if (!selectedPatient) return;
        try {
            await axios.delete(`${API_ENDPOINTS.PATIENTS}?id=${selectedPatient.id}`);
            fetchPatients();
            setShowDeleteModal(false);
            setSelectedPatient(null);
            toast.success('Patient deleted successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting patient');
        }
    };

    const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

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

    if (loading && !patients.length) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading patients...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header with Add Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Management</h1>
                    <p className="text-gray-600">{patients.length} patients registered</p>
                </div>
                {can('patients', 'create') && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium shadow-lg shadow-[#19ADB8]/30 transition-all w-full md:w-auto"
                    >
                        <Plus size={20} />
                        Add Patient
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                            <Users className="text-[#004071]" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.total || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Total Patients</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <UserCheck className="text-green-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.active_count || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Active Patients</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <UserPlus className="text-blue-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats?.new_this_month || 0}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">New This Month</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Calendar className="text-purple-600" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">-</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">Upcoming Appointments</h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search patients by name, ID, phone, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <CustomSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "all", label: "All Patients" },
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {patients.map((patient) => (
                    <div
                        key={patient.id}
                        onClick={() => user && router.push(`/${user.role}/patients/${patient.id}`)}
                        className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-[#19ADB8] hover:shadow-[#19ADB8] overflow-hidden group cursor-pointer"
                    >
                        <div className="p-6">
                            {/* Patient Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 ${getAvatarColor(patient.id)} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                                        {getInitials(patient.first_name, patient.last_name)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {patient.first_name} {patient.last_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">ID: {patient.patient_id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {can('patients', 'edit') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedPatient(patient); setShowEditModal(true); }}
                                            className="p-2 bg-white rounded-lg hover:bg-gray-50 text-gray-600 hover:text-[#004071]"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    {can('patients', 'delete') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedPatient(patient); setShowDeleteModal(true); }}
                                            className="p-2 bg-white rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    {can('users', 'create') && !patient.user_id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedPatient(patient); setShowCreateLoginModal(true); }}
                                            className="p-2 bg-white rounded-lg hover:bg-amber-50 text-gray-600 hover:text-amber-600"
                                            title="Create Login"
                                        >
                                            <Key size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mb-3">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full ${patient.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                                    {patient.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {/* Patient Details */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center text-sm text-gray-600">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>{patient.age} years • {patient.gender}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{patient.phone}</span>
                                </div>
                                {patient.email && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="truncate">{patient.email}</span>
                                    </div>
                                )}
                                {patient.blood_group && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                        <span>Blood Group: {patient.blood_group}</span>
                                    </div>
                                )}
                                {patient.doctor_name && (
                                    <div className="flex items-center text-sm text-[#004071]">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Dr. {patient.doctor_name}</span>
                                    </div>
                                )}
                                {patient.hospital_name && (
                                    <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <span>{patient.hospital_name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Medical Info */}
                            {(patient.allergies?.length > 0 || patient.medications?.length > 0) && (
                                <div className="border-t border-gray-100 pt-3 mb-3">
                                    {patient.allergies?.length > 0 && (
                                        <div className="mb-2">
                                            <span className="text-xs font-semibold text-red-600">Allergies: </span>
                                            <span className="text-xs text-gray-600">
                                                {patient.allergies.slice(0, 2).map(a => a.allergen).join(', ')}
                                                {patient.allergies.length > 2 && ` +${patient.allergies.length - 2} more`}
                                            </span>
                                        </div>
                                    )}
                                    {patient.medications?.length > 0 && (
                                        <div>
                                            <span className="text-xs font-semibold text-blue-600">💊 Medications: </span>
                                            <span className="text-xs text-gray-600">{patient.medications.length} active</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium">
                                    <Phone size={16} />
                                    Call
                                </button>
                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#004071] hover:bg-[#00335a] text-white rounded-lg text-sm font-medium">
                                    <Activity size={16} />
                                    Log Activity
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                <span>Registered: {formatDate(patient.created_at)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {patients.length === 0 && !loading && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No patients found</h3>
                    <p className="text-gray-600 mb-4">
                        {searchQuery || statusFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Add your first patient to get started'}
                    </p>
                    {can('patients', 'create') && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#004071] hover:bg-[#00335a] text-white rounded-xl font-medium"
                        >
                            <Plus size={20} />
                            Add Your First Patient
                        </button>
                    )}
                </div>
            )}

            {/* Modals */}
            {showAddModal && <AddPatientDialog onClose={() => setShowAddModal(false)} onSubmit={handleAddPatient} />}
            {showEditModal && selectedPatient && <EditPatientDialog patient={selectedPatient} onClose={() => setShowEditModal(false)} onSubmit={handleUpdatePatient} />}
            {showDeleteModal && selectedPatient && <DeletePatientDialog patient={selectedPatient} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeletePatient} />}
            {showCreateLoginModal && selectedPatient && (
                <CreateLoginDialog
                    patient={selectedPatient}
                    onClose={() => setShowCreateLoginModal(false)}
                    onSuccess={() => {
                        setShowCreateLoginModal(false);
                        fetchPatients();
                        toast.success('Login created successfully');
                    }}
                />
            )}
        </div>
    );
}

// Add Patient Dialog
function AddPatientDialog({ onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', date_of_birth: '', age: '', gender: 'Male',
        blood_group: '', email: '', phone: '', alternate_phone: '',
        address: '', city: '', state: '', postal_code: '', country: 'India',
        uhid: '', // New field
        ip_number: '', // New field
        emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
        primary_doctor_id: '', primary_hospital_id: '', medical_record_number: '',
        surgery_type: '', surgery_date: '', surgeon_id: '', hospital_surgeon_id: '', surgery_hospital_id: '',
        surgery_status: 'consultation_scheduled', surgery_notes: '',
        estimated_cost: '', payment_method: '', care_buddy_id: '',
        referred_by_role: '', referred_by_id: ''
    });
    const [doctors, setDoctors] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [carebuddies, setCarebuddies] = useState([]);
    const [referrers, setReferrers] = useState([]);

    useEffect(() => {
        if (formData.referred_by_role) {
            axios.get(`/api/v1/users?role=${formData.referred_by_role}`)
                .then(res => setReferrers(res.data.users || []))
                .catch(err => console.error('Error fetching referrers:', err));
        } else {
            setReferrers([]);
        }
    }, [formData.referred_by_role]);

    useEffect(() => {
        fetchDoctors();
        fetchHospitals();
        fetchCarebuddies();
    }, []);

    const fetchDoctors = async () => {
        try {
            const response = await axios.get('/api/v1/doctors');
            setDoctors(response.data.doctors || []);
        } catch (error) {
            console.error('Error fetching doctors:', error);
        }
    };

    const fetchHospitals = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.HOSPITALS);
            setHospitals(response.data.hospitals || []);
        } catch (error) {
            console.error('Error fetching hospitals:', error);
        }
    };

    const fetchCarebuddies = async () => {
        try {
            const response = await axios.get('/api/v1/carebuddies');
            setCarebuddies(response.data.carebuddies || []);
        } catch (error) {
            console.error('Error fetching carebuddies:', error);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.age || !formData.phone) {
            toast.error('Please fill in all required fields');
            return;
        }
        onSubmit(formData);
    };

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const calculateAge = (dob) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleDOBChange = (dob) => {
        updateField('date_of_birth', dob);
        const age = calculateAge(dob);
        updateField('age', age);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-6 py-5 border-b flex items-center justify-between z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Add New Patient</h2>
                        <p className="text-sm text-gray-600 mt-1">Enter the patient details below</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.first_name}
                                    onChange={(e) => updateField('first_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="John"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.last_name}
                                    onChange={(e) => updateField('last_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date of Birth <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date_of_birth}
                                    onChange={(e) => handleDOBChange(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Age <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.age}
                                    onChange={(e) => updateField('age', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Gender <span className="text-red-500">*</span>
                                </label>
                                <CustomSelect
                                    value={formData.gender}
                                    onChange={(value) => updateField('gender', value)}
                                    options={[
                                        { value: "Male", label: "Male" },
                                        { value: "Female", label: "Female" },
                                        { value: "Other", label: "Other" }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                                <CustomSelect
                                    value={formData.blood_group}
                                    onChange={(value) => updateField('blood_group', value)}
                                    placeholder="Select Blood Group"
                                    options={[
                                        { value: "A+", label: "A+" },
                                        { value: "A-", label: "A-" },
                                        { value: "B+", label: "B+" },
                                        { value: "B-", label: "B-" },
                                        { value: "AB+", label: "AB+" },
                                        { value: "AB-", label: "AB-" },
                                        { value: "O+", label: "O+" },
                                        { value: "O-", label: "O-" }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Record Number</label>
                                <input
                                    type="text"
                                    value={formData.medical_record_number}
                                    onChange={(e) => updateField('medical_record_number', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="MRN-12345"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">UHID (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.uhid}
                                    onChange={(e) => updateField('uhid', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Unique Health ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">IP Number (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.ip_number}
                                    onChange={(e) => updateField('ip_number', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="In-Patient Number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Phone</label>
                                <input
                                    type="tel"
                                    value={formData.alternate_phone}
                                    onChange={(e) => updateField('alternate_phone', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="john.doe@example.com"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => updateField('address', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    rows={2}
                                    placeholder="Street address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Mumbai"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                                <input
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) => updateField('state', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Maharashtra"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                                <input
                                    type="text"
                                    value={formData.postal_code}
                                    onChange={(e) => updateField('postal_code', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="400001"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                <input
                                    type="text"
                                    value={formData.country}
                                    onChange={(e) => updateField('country', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="India"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Referred By */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Referred By</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                <CustomSelect
                                    value={formData.referred_by_role}
                                    onChange={(value) => updateField('referred_by_role', value)}
                                    placeholder="Select Role"
                                    options={[
                                        { value: "sales", label: "Sales Team" },
                                        { value: "carebuddy", label: "Care Buddy" },
                                        { value: "doctors", label: "Doctor" },
                                        { value: "ops", label: "Operations" },
                                        { value: "partner", label: "Partner" }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                <CustomSelect
                                    value={formData.referred_by_id}
                                    onChange={(value) => updateField('referred_by_id', value)}
                                    placeholder={formData.referred_by_role ? "Select Referrer" : "Select Role First"}
                                    options={referrers.length > 0 ? referrers.map(r => ({ value: r.id, label: r.username || r.name || r.email })) : [{ value: "", label: "Please add referrers" }]}
                                    disabled={!formData.referred_by_role}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                                <input
                                    type="text"
                                    value={formData.emergency_contact_name}
                                    onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                                <input
                                    type="tel"
                                    value={formData.emergency_contact_phone}
                                    onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Relation</label>
                                <input
                                    type="text"
                                    value={formData.emergency_contact_relation}
                                    onChange={(e) => updateField('emergency_contact_relation', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Spouse"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Surgery Details */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Surgery Details (Optional)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Surgery Type</label>
                                <input
                                    type="text"
                                    value={formData.surgery_type}
                                    onChange={(e) => updateField('surgery_type', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="e.g., Knee Replacement"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Possible Date</label>
                                <input
                                    type="date"
                                    value={formData.surgery_date}
                                    onChange={(e) => updateField('surgery_date', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Hospital</label>
                                <CustomSelect
                                    value={formData.surgery_hospital_id}
                                    onChange={(value) => updateField('surgery_hospital_id', value)}
                                    placeholder="Select Hospital"
                                    options={hospitals.length > 0 ? hospitals.map(h => ({ value: h.id, label: h.name })) : [{ value: "", label: "Please add hospitals" }]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Surgeon</label>
                                <CustomSelect
                                    value={formData.hospital_surgeon_id}
                                    onChange={(value) => updateField('hospital_surgeon_id', value)}
                                    placeholder={formData.surgery_hospital_id ? "Select Surgeon" : "Select Hospital First"}
                                    options={
                                        formData.surgery_hospital_id
                                            ? (hospitals.find(h => h.id === formData.surgery_hospital_id)?.surgeons?.length > 0
                                                ? hospitals.find(h => h.id === formData.surgery_hospital_id)?.surgeons?.map(s => ({
                                                    value: s.id,
                                                    label: s.name
                                                }))
                                                : [{ value: "", label: "Please add surgeons" }])
                                            : []
                                    }
                                    disabled={!formData.surgery_hospital_id}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <CustomSelect
                                    value={formData.surgery_status}
                                    onChange={(value) => updateField('surgery_status', value)}
                                    options={[
                                        { value: 'consultation_scheduled', label: 'Consultation Scheduled' },
                                        { value: 'consulted', label: 'Consulted' },
                                        { value: 'preop_cleared', label: 'Pre-op Cleared' },
                                        { value: 'ot_scheduled', label: 'OT Scheduled' },
                                        { value: 'surgery_done', label: 'Surgery Done' },
                                        { value: 'discharge', label: 'Discharge' },
                                        { value: 'followup', label: 'Follow-up' },
                                        { value: 'scheduled', label: 'Scheduled (Legacy)' },
                                        { value: 'completed', label: 'Completed (Legacy)' },
                                        { value: 'cancelled', label: 'Cancelled' },
                                        { value: 'postponed', label: 'Postponed' }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Cost (₹)</label>
                                <input
                                    type="text"
                                    value={formData.estimated_cost}
                                    onChange={(e) => updateField('estimated_cost', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="150000"
                                    step="1000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                <CustomSelect
                                    value={formData.payment_method}
                                    onChange={(value) => updateField('payment_method', value)}
                                    placeholder="Select Payment Method"
                                    options={[
                                        { value: "Cash", label: "Cash" },
                                        { value: "Card", label: "Card" },
                                        { value: "UPI", label: "UPI" },
                                        { value: "Bank Transfer", label: "Bank Transfer" },
                                        { value: "Insurance", label: "Insurance" }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Care Buddy</label>
                                <CustomSelect
                                    value={formData.care_buddy_id}
                                    onChange={(value) => updateField('care_buddy_id', value)}
                                    placeholder="Select Care Buddy"
                                    options={carebuddies.length > 0 ? carebuddies.map(cb => ({ value: cb.id, label: cb.username })) : [{ value: "", label: "Please add carebuddy" }]}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Surgery Notes</label>
                                <textarea
                                    value={formData.surgery_notes}
                                    onChange={(e) => updateField('surgery_notes', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    rows={2}
                                    placeholder="Additional surgery details or notes"
                                />
                            </div>
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
                            Add Patient
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Edit Patient Dialog
function EditPatientDialog({ patient, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        id: patient.id,
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        date_of_birth: patient.date_of_birth || '',
        age: patient.age || '',
        gender: patient.gender || 'Male',
        blood_group: patient.blood_group || '',
        email: patient.email || '',
        phone: patient.phone || '',
        alternate_phone: patient.alternate_phone || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        postal_code: patient.postal_code || '',
        country: patient.country || 'India',
        uhid: patient.uhid || '',
        ip_number: patient.ip_number || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_phone: patient.emergency_contact_phone || '',
        emergency_contact_relation: patient.emergency_contact_relation || '',
        primary_doctor_id: patient.primary_doctor_id || '',
        primary_hospital_id: patient.primary_hospital_id || '',
        medical_record_number: patient.medical_record_number || '',
        surgery_type: patient.surgeries?.[0]?.surgery_type || '',
        surgery_date: patient.surgeries?.[0]?.surgery_date || '',
        surgeon_id: patient.surgeries?.[0]?.surgeon_id || '',
        surgery_hospital_id: patient.surgeries?.[0]?.hospital_id || '',
        surgery_status: patient.surgeries?.[0]?.status || 'consultation_scheduled',
        surgery_notes: patient.surgeries?.[0]?.notes || '',
        estimated_cost: patient.surgeries?.[0]?.estimated_cost || '',
        payment_method: patient.surgeries?.[0]?.payment_method || '',
        hospital_surgeon_id: patient.surgeries?.[0]?.hospital_surgeon_id || '',
        surgeon_id: patient.surgeries?.[0]?.surgeon_id || '',
        care_buddy_id: patient.surgeries?.[0]?.care_buddy_id || '',
        surgery_id: patient.surgeries?.[0]?.id || null,
        is_active: patient.is_active,
        referred_by_role: patient.referred_by_role || '',
        referred_by_id: patient.referred_by_id || ''
    });
    const [doctors, setDoctors] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [carebuddies, setCarebuddies] = useState([]);
    const [referrers, setReferrers] = useState([]);

    useEffect(() => {
        if (formData.referred_by_role) {
            axios.get(`/api/v1/users?role=${formData.referred_by_role}`)
                .then(res => setReferrers(res.data.users || []))
                .catch(err => console.error('Error fetching referrers:', err));
        } else {
            setReferrers([]);
        }
    }, [formData.referred_by_role]);

    useEffect(() => {
        fetchDoctors();
        fetchHospitals();
        fetchCarebuddies();
    }, []);

    const fetchDoctors = async () => {
        try {
            const response = await axios.get('/api/v1/doctors');
            setDoctors(response.data.doctors || []);
        } catch (error) {
            console.error('Error fetching doctors:', error);
        }
    };

    const fetchHospitals = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.HOSPITALS);
            setHospitals(response.data.hospitals || []);
        } catch (error) {
            console.error('Error fetching hospitals:', error);
        }
    };

    const fetchCarebuddies = async () => {
        try {
            const response = await axios.get('/api/v1/carebuddies');
            setCarebuddies(response.data.carebuddies || []);
        } catch (error) {
            console.error('Error fetching carebuddies:', error);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const calculateAge = (dob) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleDOBChange = (dob) => {
        updateField('date_of_birth', dob);
        const age = calculateAge(dob);
        updateField('age', age);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white px-6 py-5 border-b flex items-center justify-between z-10 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Edit Patient</h2>
                        <p className="text-sm text-gray-600 mt-1">{patient.patient_id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.first_name}
                                    onChange={(e) => updateField('first_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.last_name}
                                    onChange={(e) => updateField('last_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date of Birth <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date_of_birth}
                                    onChange={(e) => handleDOBChange(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Age <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.age}
                                    onChange={(e) => updateField('age', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Gender <span className="text-red-500">*</span>
                                </label>
                                <CustomSelect
                                    value={formData.gender}
                                    onChange={(value) => updateField('gender', value)}
                                    options={[
                                        { value: "Male", label: "Male" },
                                        { value: "Female", label: "Female" },
                                        { value: "Other", label: "Other" }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                                <CustomSelect
                                    value={formData.blood_group}
                                    onChange={(value) => updateField('blood_group', value)}
                                    placeholder="Select Blood Group"
                                    options={[
                                        { value: "A+", label: "A+" },
                                        { value: "A-", label: "A-" },
                                        { value: "B+", label: "B+" },
                                        { value: "B-", label: "B-" },
                                        { value: "AB+", label: "AB+" },
                                        { value: "AB-", label: "AB-" },
                                        { value: "O+", label: "O+" },
                                        { value: "O-", label: "O-" }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">UHID</label>
                                <input
                                    type="text"
                                    value={formData.uhid}
                                    onChange={(e) => updateField('uhid', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="Unique Health ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">IP Number</label>
                                <input
                                    type="text"
                                    value={formData.ip_number}
                                    onChange={(e) => updateField('ip_number', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="In-Patient Number"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Record Number</label>
                                <input
                                    type="text"
                                    value={formData.medical_record_number}
                                    onChange={(e) => updateField('medical_record_number', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <CustomSelect
                                    value={formData.is_active ? "1" : "0"}
                                    onChange={(value) => updateField('is_active', value === "1")}
                                    options={[
                                        { value: "1", label: "Active" },
                                        { value: "0", label: "Inactive" }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Phone</label>
                                <input
                                    type="tel"
                                    value={formData.alternate_phone}
                                    onChange={(e) => updateField('alternate_phone', e.target.value)}
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
                        </div>
                    </div>

                    {/* Referred By */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Referred By</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                <CustomSelect
                                    value={formData.referred_by_role}
                                    onChange={(value) => updateField('referred_by_role', value)}
                                    placeholder="Select Role"
                                    options={[
                                        { value: "sales", label: "Sales Team" },
                                        { value: "carebuddy", label: "Care Buddy" },
                                        { value: "doctors", label: "Doctor" },
                                        { value: "ops", label: "Operations" },
                                        { value: "partner", label: "Partner" }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                <CustomSelect
                                    value={formData.referred_by_id}
                                    onChange={(value) => updateField('referred_by_id', value)}
                                    placeholder={formData.referred_by_role ? "Select Referrer" : "Select Role First"}
                                    options={referrers.map(r => ({ value: r.id, label: r.username || r.name || r.email }))}
                                    disabled={!formData.referred_by_role}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => updateField('address', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                                <input
                                    type="text"
                                    value={formData.postal_code}
                                    onChange={(e) => updateField('postal_code', e.target.value)}
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
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                                <input
                                    type="text"
                                    value={formData.emergency_contact_name}
                                    onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                                <input
                                    type="tel"
                                    value={formData.emergency_contact_phone}
                                    onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Relation</label>
                                <input
                                    type="text"
                                    value={formData.emergency_contact_relation}
                                    onChange={(e) => updateField('emergency_contact_relation', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Surgery Details */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Surgery Details (Optional)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Surgery Type</label>
                                <input
                                    type="text"
                                    value={formData.surgery_type}
                                    onChange={(e) => updateField('surgery_type', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="e.g., Knee Replacement"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Possible Date</label>
                                <input
                                    type="date"
                                    value={formData.surgery_date}
                                    onChange={(e) => updateField('surgery_date', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Hospital</label>
                                <CustomSelect
                                    value={formData.surgery_hospital_id}
                                    onChange={(value) => updateField('surgery_hospital_id', value)}
                                    placeholder="Select Hospital"
                                    options={hospitals.length > 0 ? hospitals.map(h => ({ value: h.id, label: h.name })) : [{ value: "", label: "Please add hospitals" }]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Surgeon</label>
                                <CustomSelect
                                    value={formData.hospital_surgeon_id}
                                    onChange={(value) => updateField('hospital_surgeon_id', value)}
                                    placeholder={formData.surgery_hospital_id ? "Select Surgeon" : "Select Hospital First"}
                                    options={
                                        formData.surgery_hospital_id
                                            ? (hospitals.find(h => h.id === formData.surgery_hospital_id)?.surgeons?.length > 0
                                                ? hospitals.find(h => h.id === formData.surgery_hospital_id)?.surgeons?.map(s => ({
                                                    value: s.id,
                                                    label: s.name
                                                }))
                                                : [{ value: "", label: "Please add surgeons" }])
                                            : []
                                    }
                                    disabled={!formData.surgery_hospital_id}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <h4 className="text-sm font-medium text-gray-700 mb-2 mt-2">Referring Source</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                        <CustomSelect
                                            value={formData.referred_by_role}
                                            onChange={(value) => updateField('referred_by_role', value)}
                                            placeholder="Select Role"
                                            options={[
                                                { value: "sales", label: "Sales Team" },
                                                { value: "carebuddy", label: "Care Buddy" },
                                                { value: "doctors", label: "Doctor" },
                                                { value: "ops", label: "Operations" },
                                                { value: "partner", label: "Partner" }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                        <CustomSelect
                                            value={formData.referred_by_id}
                                            onChange={(value) => updateField('referred_by_id', value)}
                                            placeholder={formData.referred_by_role ? "Select Referrer" : "Select Role First"}
                                            options={referrers.length > 0 ? referrers.map(r => ({ value: r.id, label: r.username || r.name || r.email })) : [{ value: "", label: "Please add referrers" }]}
                                            disabled={!formData.referred_by_role}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <CustomSelect
                                    value={formData.surgery_status}
                                    onChange={(value) => updateField('surgery_status', value)}
                                    options={[
                                        { value: 'consultation_scheduled', label: 'Consultation Scheduled' },
                                        { value: 'consulted', label: 'Consulted' },
                                        { value: 'preop_cleared', label: 'Pre-op Cleared' },
                                        { value: 'ot_scheduled', label: 'OT Scheduled' },
                                        { value: 'surgery_done', label: 'Surgery Done' },
                                        { value: 'discharge', label: 'Discharge' },
                                        { value: 'followup', label: 'Follow-up' },
                                        { value: 'scheduled', label: 'Scheduled (Legacy)' },
                                        { value: 'completed', label: 'Completed (Legacy)' },
                                        { value: 'cancelled', label: 'Cancelled' },
                                        { value: 'postponed', label: 'Postponed' }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Cost (₹)</label>
                                <input
                                    type="text"
                                    value={formData.estimated_cost}
                                    onChange={(e) => updateField('estimated_cost', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    placeholder="150000"
                                    step="1000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                <CustomSelect
                                    value={formData.payment_method}
                                    onChange={(value) => updateField('payment_method', value)}
                                    placeholder="Select Payment Method"
                                    options={[
                                        { value: "Cash", label: "Cash" },
                                        { value: "Card", label: "Card" },
                                        { value: "UPI", label: "UPI" },
                                        { value: "Bank Transfer", label: "Bank Transfer" },
                                        { value: "Insurance", label: "Insurance" }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Care Buddy</label>
                                <CustomSelect
                                    value={formData.care_buddy_id}
                                    onChange={(value) => updateField('care_buddy_id', value)}
                                    placeholder="Select Care Buddy"
                                    options={carebuddies.length > 0 ? carebuddies.map(cb => ({ value: cb.id, label: cb.username })) : [{ value: "", label: "Please add carebuddy" }]}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Surgery Notes</label>
                                <textarea
                                    value={formData.surgery_notes}
                                    onChange={(e) => updateField('surgery_notes', e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                                    rows={2}
                                    placeholder="Additional surgery details or notes"
                                />
                            </div>
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

// Delete Patient Dialog
function DeletePatientDialog({ patient, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                        <Trash2 className="text-red-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Delete Patient</h2>
                        <p className="text-sm text-gray-500">{patient.patient_id}</p>
                    </div>
                </div>
                <p className="text-gray-700 mb-4">
                    Are you sure you want to delete <strong>{patient.first_name} {patient.last_name}</strong>?
                </p>
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                    <p className="text-sm text-red-800 flex items-start gap-2">
                        <span>This action cannot be undone. All patient data including medical history, allergies, medications, and insurance information will be permanently deleted.</span>
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

// Create Login Dialog
function CreateLoginDialog({ patient, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        username: patient.email || ((patient.first_name || '') + (patient.phone ? patient.phone.slice(-4) : '1234')).toLowerCase(),
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/v1/patients/create-login', {
                patient_id: patient.id,
                ...formData
            });
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating login');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Create Patient Login</h3>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="text"
                            required
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-[#004071] text-white rounded-xl font-medium hover:bg-[#00335a] transition-colors"
                    >
                        Create Login
                    </button>
                </form>
            </div>
        </div>
    );
}
