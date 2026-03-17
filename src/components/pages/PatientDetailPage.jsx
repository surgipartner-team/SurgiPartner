'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import {
    ArrowLeft, Mail, FileText, Calendar, FolderOpen,
    Phone, MapPin, User, Heart, Pill, Shield, Edit2,
    Activity, Clock, CheckCircle, Trash2, Send, Upload, Plus,
    User2, CreditCard, DollarSign, Download, Share2, Copy, X, Eye
} from 'lucide-react';
import { toast } from 'react-toastify';
import LogActivityModal from '@/components/patients/LogActivityModal';
import RecordPaymentModal from '@/components/patients/RecordPaymentModal';
import { usePermissions } from '@/hooks/usePermissions';

export default function PatientDetailPage() {
    const router = useRouter();
    const { user } = usePermissions();
    const params = useParams();
    const patientId = params.id;

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('timeline');

    // Data states
    const [activities, setActivities] = useState([]);
    const [notes, setNotes] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [payments, setPayments] = useState([]);
    const [paymentSummary, setPaymentSummary] = useState({ total_amount: 0, total_paid: 0, balance: 0 });

    // Modal states
    const [showLogActivityModal, setShowLogActivityModal] = useState(false);
    const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareData, setShareData] = useState(null);
    const [generatingLink, setGeneratingLink] = useState(false);

    // Form states
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        fetchPatientDetails();
    }, [patientId]);

    useEffect(() => {
        if (patient) {
            if (activeTab === 'timeline') fetchActivities();
            if (activeTab === 'notes') fetchNotes();
            if (activeTab === 'documents') fetchDocuments();
            if (activeTab === 'payments') fetchPayments();
        }
    }, [activeTab, patient]);

    const fetchPatientDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_ENDPOINTS.PATIENTS}?id=${patientId}`);
            if (response.data.patients && response.data.patients.length > 0) {
                setPatient(response.data.patients[0]);
            } else {
                toast.error('Patient not found');
                user && router.push(`/${user.role}/patients`);
            }
        } catch (error) {
            console.error('Error fetching patient:', error);
            toast.error('Error loading patient details');
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        try {
            const response = await axios.get(`/api/v1/patients/${patientId}/activities`);
            setActivities(response.data.activities || []);
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    };

    const fetchNotes = async () => {
        try {
            const response = await axios.get(`/api/v1/patients/${patientId}/notes`);
            setNotes(response.data.notes || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
        }
    };

    const fetchDocuments = async () => {
        try {
            const response = await axios.get(`/api/v1/patients/${patientId}/documents`);
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const fetchPayments = async () => {
        try {
            const response = await axios.get(`/api/v1/patients/${patientId}/payments`);
            setPayments(response.data.payments || []);
            setPaymentSummary(response.data.summary || { total_amount: 0, total_paid: 0, balance: 0 });
        } catch (error) {
            console.error('Error fetching payments:', error);
        }
    };

    const handleLogActivity = async (activityData) => {
        try {
            await axios.post(`/api/v1/patients/${patientId}/activities`, activityData);
            toast.success('Activity logged successfully');
            setShowLogActivityModal(false);
            fetchActivities();
        } catch (error) {
            toast.error('Error logging activity');
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        try {
            await axios.post(`/api/v1/patients/${patientId}/notes`, { note_text: newNote });
            toast.success('Note added successfully');
            setNewNote('');
            fetchNotes();
        } catch (error) {
            toast.error('Error adding note');
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            await axios.delete(`/api/v1/patients/${patientId}/notes?noteId=${noteId}`);
            toast.success('Note deleted successfully');
            fetchNotes();
        } catch (error) {
            toast.error('Error deleting note');
        }
    };

    const handleRecordPayment = async (paymentData) => {
        try {
            await axios.post(`/api/v1/patients/${patientId}/payments`, paymentData);
            toast.success('Payment recorded successfully');
            setShowRecordPaymentModal(false);
            fetchPayments();
        } catch (error) {
            toast.error('Error recording payment');
        }
    };

    const handleShareCredentials = async () => {
        if (!confirm("This will reset the patient's password and generate a new secure link. Continue?")) return;

        try {
            setGeneratingLink(true);
            const response = await axios.post('/api/v1/patients/share-credentials', { patientId });
            setShareData(response.data);
            setShowShareModal(true);
            toast.success('Secure link generated');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate secure link');
        } finally {
            setGeneratingLink(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    const getActivityIcon = (type) => {
        const icons = {
            phone_call: Phone,
            email: Mail,
            message_sms: Send,
            meeting_video: Activity,
            note: FileText,
            task_completed: CheckCircle
        };
        return icons[type] || Activity;
    };

    const getActivityColor = (type) => {
        const colors = {
            phone_call: 'bg-teal-100 text-teal-600',
            email: 'bg-blue-100 text-blue-600',
            message_sms: 'bg-green-100 text-green-600',
            meeting_video: 'bg-purple-100 text-purple-600',
            note: 'bg-gray-100 text-gray-600',
            task_completed: 'bg-green-100 text-green-600'
        };
        return colors[type] || 'bg-gray-100 text-gray-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading patient details...</div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Patient not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => user && router.push(`/${user.role}/patients`)}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#004071] mb-4 font-medium"
                >
                    <ArrowLeft size={20} />
                    Back to Patients
                </button>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className={`w-16 h-16 ${getAvatarColor(patient.id)} rounded-full flex shrink-0 items-center justify-center text-white font-bold text-2xl`}>
                                {getInitials(patient.first_name, patient.last_name)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 break-all">
                                    {patient.first_name} {patient.last_name}
                                </h1>
                                <p className="text-gray-500">Patient ID: {patient.patient_id}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="text-sm text-gray-600">
                                        {patient.age} years • {patient.gender}
                                    </span>
                                    {patient.blood_group && (
                                        <>
                                            <span className="text-gray-300 hidden sm:inline">•</span>
                                            <span className="text-sm text-gray-600">
                                                Blood Group: {patient.blood_group}
                                            </span>
                                        </>
                                    )}
                                    <span className="text-gray-300 hidden sm:inline">•</span>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${patient.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>
                                        {patient.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    {patient.referred_by_name && (
                                        <>
                                            <span className="text-gray-300 hidden sm:inline">•</span>
                                            <span className="text-sm text-gray-600">
                                                Referred by: <strong>{patient.referred_by_name}</strong>
                                            </span>
                                        </>
                                    )}
                                    <button
                                        onClick={handleShareCredentials}
                                        disabled={generatingLink}
                                        className="ml-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                                        title="Share Login Credentials"
                                    >
                                        <Share2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setShowLogActivityModal(true)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                            >
                                <Activity size={18} />
                                Log Activity
                            </button>

                        </div>
                    </div>
                </div>
            </div>
            {/* Share Modal */}
            {showShareModal && shareData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Share2 size={24} className="text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Share Credentials</h3>
                            <p className="text-sm text-gray-500 mt-1">This link is valid for <span className="font-bold text-gray-900">2 minutes</span>.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-2">
                                <code className="flex-1 text-xs text-gray-600 break-all">{shareData.link}</code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareData.link);
                                        toast.success("Link copied!");
                                    }}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <a
                                    href={`https://wa.me/${shareData.mobile?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(`Hello ${shareData.patientName}, here are your login credentials for the SurgiPartner Portal. This link expires in 2 minutes: ${shareData.link}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                                >
                                    <Phone size={18} />
                                    WhatsApp
                                </a>
                                <a
                                    href={`mailto:${shareData.email || ''}?subject=SurgiPartner Portal Login&body=${encodeURIComponent(`Hello ${shareData.patientName},\n\nHere are your login credentials for the SurgiPartner Portal.\n\nSecure Link (Expires in 2 minutes): ${shareData.link}\n\nRegards,\nSurgiPartner Team`)}`}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    <Mail size={18} />
                                    Email
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Contact Information */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Phone className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{patient.phone || '-'}</p>
                                </div>
                            </div>
                            {patient.alternate_phone && (
                                <div className="flex items-start gap-3">
                                    <Phone className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm text-gray-500">Alternate Phone</p>
                                        <p className="text-sm font-medium text-gray-900">{patient.alternate_phone}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <Mail className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{patient.email || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-sm text-gray-500">Address</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {patient.address || '-'}
                                        {patient.city && `, ${patient.city}`}
                                        {patient.state && `, ${patient.state}`}
                                        {patient.postal_code && ` - ${patient.postal_code}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Surgery Details */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Surgery Details</h3>
                        {patient.surgeries && patient.surgeries.length > 0 ? (
                            <div className="space-y-4">
                                {patient.surgeries.map((surgery, index) => (
                                    <div key={surgery.id} className={index > 0 ? "pt-4 border-t border-gray-100" : ""}>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <FileText className="text-gray-400 mt-1" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Surgery Type</p>
                                                    <p className="text-sm font-medium text-gray-900">{surgery.surgery_type}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Calendar className="text-gray-400 mt-1" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Surgery Date</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {surgery.surgery_date ? formatDate(surgery.surgery_date) : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <User2 className="text-gray-400 mt-1" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Surgeon</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {surgery.surgeon_name || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <User className="text-gray-400 mt-1" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">CareBuddy</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {surgery.care_buddy_name || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <MapPin className="text-gray-400 mt-1" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Hospital</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {surgery.surgery_hospital_name || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <CreditCard className="text-gray-400 mt-1" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Payment Method</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {surgery.payment_method || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <CheckCircle className="text-gray-400 mt-1" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Status</p>
                                                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${surgery.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                        surgery.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                            surgery.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
                                                                'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                        }`}>
                                                        {surgery.status.charAt(0).toUpperCase() + surgery.status.slice(1)}
                                                    </span>
                                                </div>
                                            </div>
                                            {surgery.notes && (
                                                <div className="flex items-start gap-3">
                                                    <FileText className="text-gray-400 mt-1" size={18} />
                                                    <div>
                                                        <p className="text-sm text-gray-500">Notes</p>
                                                        <p className="text-sm text-gray-700">{surgery.notes}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-sm text-gray-500">No surgery details available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                        {/* Tabs */}
                        <div className="border-b border-gray-200 px-6 overflow-x-auto">
                            <div className="flex gap-8 min-w-max">
                                {['timeline', 'notes', 'documents', 'payments']
                                    .filter(tab => tab !== 'payments' || user?.role !== 'carebuddy')
                                    .map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                                ? 'border-[#19ADB8] text-[#004071]'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {/* Timeline Tab */}
                            {activeTab === 'timeline' && (
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
                                        <button
                                            onClick={() => setShowLogActivityModal(true)}
                                            className="px-4 py-2 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg text-xs font-medium"
                                        >
                                            Log New Activity
                                        </button>
                                    </div>

                                    {/* Medical Information */}
                                    {(patient.allergies?.length > 0 || patient.medical_history?.length > 0 || patient.medications?.length > 0) && (
                                        <div className="mb-6 space-y-4">
                                            {patient.allergies?.length > 0 && (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-3">
                                                        <Heart className="text-red-600 mt-1" size={18} />
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-semibold text-red-900 mb-2">Allergies</h4>
                                                            <div className="space-y-2">
                                                                {patient.allergies.map((allergy, index) => (
                                                                    <div key={index} className="text-sm text-red-800">
                                                                        <span className="font-medium">{allergy.allergen}</span>
                                                                        {allergy.severity && (
                                                                            <span className="ml-2 px-2 py-0.5 bg-red-100 rounded text-xs">
                                                                                {allergy.severity}
                                                                            </span>
                                                                        )}
                                                                        {allergy.reaction && (
                                                                            <p className="text-xs text-red-700 mt-1">{allergy.reaction}</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {patient.medications?.length > 0 && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-3">
                                                        <Pill className="text-blue-600 mt-1" size={18} />
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Current Medications</h4>
                                                            <div className="space-y-2">
                                                                {patient.medications.map((med, index) => (
                                                                    <div key={index} className="text-sm text-blue-800">
                                                                        <span className="font-medium">{med.medication_name}</span>
                                                                        {med.dosage && <span className="ml-2 text-blue-700">- {med.dosage}</span>}
                                                                        {med.frequency && <span className="ml-2 text-blue-700">({med.frequency})</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {patient.medical_history?.length > 0 && (
                                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                                    <div className="flex items-start gap-3">
                                                        <FileText className="text-purple-600 mt-1" size={18} />
                                                        <div className="flex-1">
                                                            <h4 className="text-sm font-semibold text-purple-900 mb-2">Medical History</h4>
                                                            <div className="space-y-2">
                                                                {patient.medical_history.map((history, index) => (
                                                                    <div key={index} className="text-sm text-purple-800">
                                                                        <span className="font-medium">{history.condition_name}</span>
                                                                        {history.status && (
                                                                            <span className="ml-2 px-2 py-0.5 bg-purple-100 rounded text-xs">
                                                                                {history.status}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Activities List */}
                                    {activities.length > 0 ? (
                                        <div className="space-y-4">
                                            {activities.map((activity) => {
                                                const Icon = getActivityIcon(activity.activity_type);
                                                return (
                                                    <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                                                                <Icon size={18} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div>
                                                                        <h4 className="font-semibold text-gray-900 capitalize">
                                                                            {activity.activity_type.replace('_', ' ')}
                                                                        </h4>
                                                                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                                                                    </div>
                                                                    <span className="text-xs text-gray-500">{formatDateTime(activity.created_at)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                                    {activity.duration_minutes && (
                                                                        <span>Duration: {activity.duration_minutes} min</span>
                                                                    )}
                                                                    {activity.outcome && (
                                                                        <span className="px-2 py-1 bg-gray-100 rounded">
                                                                            {activity.outcome}
                                                                        </span>
                                                                    )}
                                                                    {activity.created_by_name && (
                                                                        <span>By: {activity.created_by_name}</span>
                                                                    )}
                                                                </div>
                                                                {activity.additional_notes && (
                                                                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                                                        {activity.additional_notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Clock size={32} className="text-gray-400" />
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-2">No activities yet</h4>
                                            <p className="text-gray-600 mb-4">Start logging activities for this patient</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes Tab */}
                            {activeTab === 'notes' && (
                                <div>
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Note</h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Type your note here..."
                                                rows={4}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent resize-none"
                                            />
                                            <div className="flex justify-end mt-3">
                                                <button
                                                    onClick={handleAddNote}
                                                    disabled={!newNote.trim()}
                                                    className="px-4 py-2 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    <Send size={18} />
                                                    Add Note
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Notes</h3>
                                    {notes.length > 0 ? (
                                        <div className="space-y-4">
                                            {notes.map((note) => (
                                                <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <p className="text-gray-900">{note.note_text}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteNote(note.id)}
                                                            className="p-1 hover:bg-red-50 rounded text-red-600"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span>{formatDateTime(note.created_at)}</span>
                                                        {note.created_by_name && <span>By: {note.created_by_name}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-gray-600">No notes yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Documents Tab */}
                            {activeTab === 'documents' && (
                                <div>
                                    {documents.length > 0 ? (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900">Uploaded Documents</h3>
                                                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, PDF, Word, Excel, PowerPoint, CSV, TXT · Max 10MB</p>
                                                </div>
                                                <label className="px-4 py-2 text-sm bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium flex items-center gap-2 cursor-pointer">
                                                    <Upload size={18} />
                                                    Upload Document
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                try {
                                                                    const formData = new FormData();
                                                                    formData.append('file', file);
                                                                    formData.append('document_name', file.name);
                                                                    formData.append('document_type', file.type || 'application/octet-stream');
                                                                    formData.append('file_size', file.size);

                                                                    await axios.post(`/api/v1/patients/${patientId}/documents`, formData, {
                                                                        headers: {
                                                                            'Content-Type': 'multipart/form-data'
                                                                        }
                                                                    });
                                                                    toast.success('Document uploaded successfully');
                                                                    fetchDocuments();
                                                                } catch (error) {
                                                                    toast.error('Error uploading document');
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <div className="space-y-3">
                                                {documents.map((doc) => (
                                                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-blue-50 rounded-lg">
                                                                    <FileText size={24} className="text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-gray-900">{doc.document_name}</p>
                                                                    <p className="text-sm text-gray-600 mt-1">
                                                                        {doc.document_type} • {formatDateTime(doc.uploaded_at)}
                                                                    </p>
                                                                    {doc.uploaded_by_name && (
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            Uploaded by: {doc.uploaded_by_name}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm('Are you sure you want to delete this document?')) {
                                                                            try {
                                                                                await axios.delete(`/api/v1/patients/${patientId}/documents?docId=${doc.id}`);
                                                                                toast.success('Document deleted successfully');
                                                                                fetchDocuments();
                                                                            } catch (error) {
                                                                                toast.error('Error deleting document');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-2 hover:bg-red-50 rounded text-red-600"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                                <a
                                                                    href={`/api/v1/documents/download?type=patient&docId=${doc.id}&preview=true`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 hover:bg-blue-50 rounded text-blue-600"
                                                                    title="View"
                                                                >
                                                                    <Eye size={18} />
                                                                </a>
                                                                <a
                                                                    href={`/api/v1/documents/download?type=patient&docId=${doc.id}`}
                                                                    download
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 hover:bg-blue-50 rounded text-blue-600"
                                                                    title="Download"
                                                                >
                                                                    <Download size={18} />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FolderOpen size={32} className="text-gray-400" />
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-2">No documents uploaded</h4>
                                            <p className="text-gray-600 mb-4">Upload medical records, reports, and other documents</p>
                                            <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 mx-auto cursor-pointer inline-flex">
                                                <Plus size={18} />
                                                Upload Document
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            try {
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                formData.append('document_name', file.name);
                                                                formData.append('document_type', file.type || 'application/octet-stream');
                                                                formData.append('file_size', file.size);

                                                                await axios.post(`/api/v1/patients/${patientId}/documents`, formData, {
                                                                    headers: {
                                                                        'Content-Type': 'multipart/form-data'
                                                                    }
                                                                });
                                                                toast.success('Document uploaded successfully');
                                                                fetchDocuments();
                                                            } catch (error) {
                                                                toast.error('Error uploading document');
                                                            }
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payments Tab */}
                            {activeTab === 'payments' && (
                                <div>
                                    {/* Payment Summary Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                                            <p className="text-lg sm:text-2xl font-bold text-gray-900">
                                                ₹{paymentSummary.total_amount.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <p className="text-sm text-green-700 mb-1">Paid</p>
                                            <p className="text-lg sm:text-2xl font-bold text-green-700">
                                                ₹{paymentSummary.total_paid.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <p className="text-sm text-red-700 mb-1">Balance</p>
                                            <p className="text-lg sm:text-2xl font-bold text-red-700">
                                                ₹{paymentSummary.balance.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </div>

                                    {payments.length > 0 ? (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                                             {/*   <button
                                                    onClick={() => setShowRecordPaymentModal(true)}
                                                    className="px-4 py-2 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium flex items-center gap-2"
                                                >
                                                    <Plus size={18} />
                                                    Record Payment
                                                </button>*/}
                                            </div>
                                            <div className="space-y-3">
                                                {payments.map((payment) => (
                                                    <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-semibold text-gray-900">
                                                                    ₹{Number(payment.amount).toLocaleString('en-IN')}
                                                                </p>
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    {formatDate(payment.payment_date)} • {payment.payment_method.replace('_', ' ')}
                                                                </p>
                                                                {payment.transaction_id && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Transaction ID: {payment.transaction_id}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${payment.payment_status === 'completed'
                                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                                }`}>
                                                                {payment.payment_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-gray-600 mb-4">Payment history will appear here</p>
                                            <button
                                                onClick={() => setShowRecordPaymentModal(true)}
                                                className="px-4 py-2 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium flex items-center gap-2 mx-auto"
                                            >
                                                <Plus size={18} />
                                                Record Payment
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <LogActivityModal
                isOpen={showLogActivityModal}
                onClose={() => setShowLogActivityModal(false)}
                patientName={`${patient.first_name} ${patient.last_name}`}
                onSubmit={handleLogActivity}
            />

            <RecordPaymentModal
                isOpen={showRecordPaymentModal}
                onClose={() => setShowRecordPaymentModal(false)}
                patientName={`${patient.first_name} ${patient.last_name}`}
                onSubmit={handleRecordPayment}
            />
        </div >
    );
}
