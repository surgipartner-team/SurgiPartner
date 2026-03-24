'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import {
    ArrowLeft, Mail, FileText, Calendar, Phone, MapPin, User,
    Activity, Clock, CheckCircle, Trash2, Send, Upload, Plus, DollarSign, Download, Eye
} from 'lucide-react';
import { toast } from 'react-toastify';
import LogActivityModal from '@/components/patients/LogActivityModal';
import RecordPaymentModal from '@/components/patients/RecordPaymentModal';
import { usePermissions } from '@/hooks/usePermissions';

const STAGE_LABELS = {
    consultation_scheduled: 'Consultation Scheduled',
    consulted: 'Consulted',
    preop_cleared: 'Pre-op Cleared',
    ot_scheduled: 'OT Scheduled',
    surgery_done: 'Surgery Done',
    discharge: 'Discharge',
    followup: 'Follow-up'
};

const STAGE_COLORS = {
    consultation_scheduled: 'bg-blue-500',
    consulted: 'bg-purple-500',
    preop_cleared: 'bg-teal-500',
    ot_scheduled: 'bg-indigo-500',
    surgery_done: 'bg-green-500',
    discharge: 'bg-orange-500',
    followup: 'bg-pink-500'
};

export default function PipelineDetailPage() {
    const router = useRouter();
    const { user, can } = usePermissions();
    const params = useParams();
    const caseId = params.id;

    const [caseData, setCaseData] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tasks');

    // Data states
    const [activities, setActivities] = useState([]);
    const [notes, setNotes] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [payments, setPayments] = useState([]);
    const [paymentSummary, setPaymentSummary] = useState({ total_amount: 0, total_paid: 0, balance: 0 });

    // Modal states
    const [showLogActivityModal, setShowLogActivityModal] = useState(false);
    const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);

    // Form states
    const [newNote, setNewNote] = useState('');
    const [tasks, setTasks] = useState([]);
    const [selectedStage, setSelectedStage] = useState('');
    const [updatingStage, setUpdatingStage] = useState(false);

    // Default tasks for new cases
    const DEFAULT_TASKS = [
        { name: 'KYC & Registration Complete', completed: false },
        { name: 'Consent Forms Signed', completed: false },
        { name: 'Pre-op Investigations Complete', completed: false }
    ];

    useEffect(() => {
        fetchCaseDetails();
        fetchPayments(); // Fetch payments on initial load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caseId]);

    useEffect(() => {
        if (caseData) {
            if (activeTab === 'tasks') {
                // Load tasks from case data, or use default tasks if none exist
                const caseTasks = caseData.progress_checklist || [];
                setTasks(caseTasks.length > 0 ? caseTasks : DEFAULT_TASKS);
            }
            if (activeTab === 'documents') fetchDocuments();
            if (activeTab === 'communication') { fetchActivities(); fetchNotes(); }
            if (activeTab === 'timeline') fetchActivities();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, caseData]);

    const fetchCaseDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/v1/pipeline?id=${caseId}`);

            if (response.data.cases && response.data.cases.length > 0) {
                const caseItem = response.data.cases[0];
                setCaseData(caseItem);

                const patientData = {
                    id: caseItem.patient_id,
                    patient_id: caseItem.patient_id,
                    first_name: caseItem.first_name,
                    last_name: caseItem.last_name,
                    age: caseItem.age,
                    gender: caseItem.gender,
                    phone: caseItem.phone,
                    email: caseItem.email
                };

                setPatient(patientData);
            } else {
                console.error('No cases found in response. Response data:', response.data);
                toast.error('Case not found');
                user && router.push(`/${user.role}/pipeline`);
            }
        } catch (error) {
            console.error('Error fetching case:', error);
            console.error('Error response:', error.response?.data);
            toast.error('Error loading case details');
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        try {
            const response = await axios.get(`/api/v1/pipeline/${caseId}/activities`);
            setActivities(response.data.activities || []);
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    };

    const fetchNotes = async () => {
        try {
            const response = await axios.get(`/api/v1/pipeline/${caseId}/notes`);
            setNotes(response.data.notes || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
        }
    };

    const fetchDocuments = async () => {
        try {
            const response = await axios.get(`/api/v1/pipeline/${caseId}/documents`);
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const handleDocumentDownload = async (docId, isPreview = false, fileName = 'document.pdf') => {
        try {
            const toastId = toast.loading(isPreview ? 'Opening...' : 'Downloading...');
            const url = `/api/v1/documents/download?type=patient&docId=${docId}${isPreview ? '&preview=true' : ''}`;
            const response = await axios.get(url, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(response.data);
            if (isPreview) {
                window.open(blobUrl, '_blank');
            } else {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            toast.dismiss(toastId);
        } catch (error) {
            console.error('Error handling doc:', error);
            toast.dismiss();
            toast.error('Failed to load document');
        }
    };

    const fetchPayments = async () => {
        try {
            const response = await axios.get(`/api/v1/pipeline/${caseId}/payments`);
            setPayments(response.data.payments || []);
            setPaymentSummary(response.data.summary || { total_amount: 0, total_paid: 0, balance: 0 });
        } catch (error) {
            console.error('Error fetching payments:', error);
        }
    };

    const handleLogActivity = async (activityData) => {
        try {
            await axios.post(`/api/v1/pipeline/${caseId}/activities`, activityData);
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
            await axios.post(`/api/v1/pipeline/${caseId}/notes`, { note_text: newNote });
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
            await axios.delete(`/api/v1/pipeline/${caseId}/notes?noteId=${noteId}`);
            toast.success('Note deleted successfully');
            fetchNotes();
        } catch (error) {
            toast.error('Error deleting note');
        }
    };

    const handleRecordPayment = async (paymentData) => {
        try {
            await axios.post(`/api/v1/pipeline/${caseId}/payments`, paymentData);
            toast.success('Payment recorded successfully');
            setShowRecordPaymentModal(false);
            fetchPayments();
        } catch (error) {
            toast.error('Error recording payment');
        }
    };

    const handleTaskToggle = async (taskIndex) => {
        const updatedTasks = [...tasks];
        updatedTasks[taskIndex].completed = !updatedTasks[taskIndex].completed;
        setTasks(updatedTasks);

        try {
            await axios.put('/api/v1/pipeline', {
                id: caseId,
                progress_checklist: updatedTasks
            });
            toast.success('Task updated');
            fetchCaseDetails();
        } catch (error) {
            toast.error('Error updating task');
        }
    };

    const handleStageChange = async () => {
        if (!selectedStage || selectedStage === caseData.status) return;

        setUpdatingStage(true);
        try {
            await axios.put('/api/v1/pipeline', {
                id: caseId,
                status: selectedStage
            });
            toast.success(`Stage updated to ${STAGE_LABELS[selectedStage]}`);
            setSelectedStage('');
            fetchCaseDetails();
        } catch (error) {
            console.error('Error updating stage:', error);
            toast.error('Error updating stage');
        } finally {
            setUpdatingStage(false);
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
        if (!id) return colors[0];
        const numId = typeof id === 'number' ? id : String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[numId % colors.length];
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
                    <div className="text-lg text-gray-600">Loading case details...</div>
                </div>
            </div>
        );
    }

    if (!caseData || !patient) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-lg text-gray-600">Case not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => user && router.push(`/${user.role}/pipeline`)}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#004071] mb-4 font-medium"
                >
                    <ArrowLeft size={20} />
                    Back to Pipeline
                </button>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 ${getAvatarColor(patient.id)} rounded-full flex items-center justify-center text-white font-bold text-2xl`}>
                                {getInitials(patient.first_name, patient.last_name)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {patient.first_name} {patient.last_name}
                                </h1>
                                <p className="text-gray-500">Case #{caseData.id}</p>
                                <p className="text-lg text-[#004071] font-semibold mt-1">{caseData.surgery_type}</p>
                            </div>
                        </div>
                        <div className="w-full md:w-auto grid grid-cols-2 sm:flex gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 mt-4 sm:mt-0">
                            <button
                                onClick={() => setShowLogActivityModal(true)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                            >
                                <Activity size={18} />
                                Log Activity
                            </button>
                            <button
                                onClick={() => window.open(`tel:${patient.phone}`)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium"
                            >
                                <Phone size={18} />
                                Call Patient
                            </button>
                        </div>
                    </div>

                    {/* Progress Tracker */}
                    <div className="mt-6 overflow-x-auto pb-2">
                        <div className="min-w-[600px]">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-700">Case Progress</h3>
                                <span className="text-sm text-gray-600">{Math.round((Object.keys(STAGE_LABELS).indexOf(caseData.status) + 1) / Object.keys(STAGE_LABELS).length * 100)}% Complete</span>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                {/* Progress bar */}
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#19ADB8] to-[#004071] rounded-full transition-all duration-500"
                                        style={{ width: `${((Object.keys(STAGE_LABELS).indexOf(caseData.status) + 1) / Object.keys(STAGE_LABELS).length) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {Object.keys(STAGE_LABELS).map((stage, index) => (
                                    <div key={stage} className="flex-1 text-center">
                                        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center border-2 ${Object.keys(STAGE_LABELS).indexOf(caseData.status) >= index
                                            ? 'bg-[#19ADB8] border-[#19ADB8] text-white'
                                            : 'bg-white border-gray-300 text-gray-400'
                                            }`}>
                                            {Object.keys(STAGE_LABELS).indexOf(caseData.status) > index ? (
                                                <CheckCircle size={18} />
                                            ) : (
                                                <Clock size={16} />
                                            )}
                                        </div>
                                        <p className={`text-xs mt-2 ${caseData.status === stage ? 'font-semibold text-[#004071]' : 'text-gray-500'}`}>
                                            {STAGE_LABELS[stage]}
                                        </p>
                                        {caseData.status === stage && caseData[`${stage}_date`] && (
                                            <p className="text-xs text-gray-400">{formatDate(caseData[`${stage}_date`])}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Manual Stage Change */}
                    {can('pipeline', 'manage') && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity className="text-[#19ADB8]" size={18} />
                                <h3 className="text-sm font-semibold text-gray-700">Manual Stage Change (OPS Only)</h3>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Select New Stage</label>
                                    <select
                                        value={selectedStage}
                                        onChange={(e) => setSelectedStage(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                                    >
                                        <option value="">Choose stage...</option>
                                        {Object.entries(STAGE_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label} {caseData.status === key ? '(Current)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleStageChange}
                                    disabled={!selectedStage || selectedStage === caseData.status || updatingStage}
                                    className="px-6 py-2.5 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-5"
                                >
                                    <Activity size={18} />
                                    {updatingStage ? 'Updating...' : 'Update Stage'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Patient Information */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <User className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-sm text-gray-500">Age & Gender</p>
                                    <p className="text-sm font-medium text-gray-900">{patient.age} years • {patient.gender}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{patient.phone || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{patient.email || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Care Team */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Care Team</h3>
                        <div className="space-y-3">
                            {caseData.surgeon_name && (
                                <div className="flex items-start gap-3">
                                    <User className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm text-gray-500">Surgeon</p>
                                        <p className="text-sm font-medium text-gray-900">Dr. {caseData.surgeon_name}</p>
                                    </div>
                                </div>
                            )}
                            {caseData.hospital_name && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm text-gray-500">Hospital</p>
                                        <p className="text-sm font-medium text-gray-900">{caseData.hospital_name}</p>
                                    </div>
                                </div>
                            )}
                            {caseData.care_buddy_name && (
                                <div className="flex items-start gap-3">
                                    <User className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm text-gray-500">Care Buddy</p>
                                        <p className="text-sm font-medium text-gray-900">{caseData.care_buddy_name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Surgery Details */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Surgery Details</h3>
                        <div className="space-y-3">
                            {caseData.surgery_date && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm text-gray-500">Surgery Date</p>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(caseData.surgery_date)}</p>
                                    </div>
                                </div>
                            )}
                            {caseData.consultation_date && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm text-gray-500">Consultation</p>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(caseData.consultation_date)}</p>
                                    </div>
                                </div>
                            )}
                            {caseData.ot_scheduled_date && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm text-gray-500">OT Scheduled</p>
                                        <p className="text-sm font-medium text-gray-900">{formatDate(caseData.ot_scheduled_date)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                            {/*<button
                                onClick={() => { fetchPayments(); setShowRecordPaymentModal(true); }}
                                className="text-sm text-[#19ADB8] hover:text-[#17a0ab] font-medium"
                            >
                                + Record Payment
                            </button>*/}
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total Amount</span>
                                <span className="text-sm font-semibold text-gray-900">
                                    ₹{Number(paymentSummary.total_amount || 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Paid Amount</span>
                                <span className="text-sm font-semibold text-green-600">
                                    ₹{Number(paymentSummary.total_paid || 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <span className="text-sm font-semibold text-gray-900">Outstanding</span>
                                <span className="text-sm font-bold text-red-600">
                                    ₹{Number(paymentSummary.balance || 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                        {/* Tabs */}
                        <div className="border-b border-gray-200 px-6 overflow-x-auto">
                            <div className="flex gap-8 min-w-max">
                                {['tasks', 'documents', 'communication', 'timeline'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                            ? 'border-[#19ADB8] text-[#004071]'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {/* Tasks Tab */}
                            {activeTab === 'tasks' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-Surgery Checklist</h3>
                                    {tasks.length > 0 ? (
                                        <div className="space-y-3">
                                            {tasks.map((task, index) => (
                                                <div
                                                    key={index}
                                                    className={`flex items-center gap-3 p-4 border rounded-lg hover:shadow-sm transition-all ${task.completed ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={task.completed}
                                                        onChange={() => handleTaskToggle(index)}
                                                        className="w-5 h-5 text-[#19ADB8] rounded focus:ring-[#19ADB8] accent-[#19ADB8]"
                                                    />
                                                    <span className={`flex-1 font-medium ${task.completed ? 'text-gray-500' : 'text-[#004071]'}`}>
                                                        {task.name}
                                                    </span>
                                                    {task.completed && (
                                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Done</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-400">
                                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No tasks defined for this case</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Documents Tab */}
                            {activeTab === 'documents' && (
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

                                                            await axios.post(`/api/v1/pipeline/${caseId}/documents`, formData, {
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

                                    {documents.length > 0 ? (
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
                                                                    {formatDateTime(doc.uploaded_at)}
                                                                </p>
                                                                {doc.uploaded_by_name && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Uploaded by: {doc.uploaded_by_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Are you sure you want to delete this document?')) {
                                                                    try {
                                                                        await axios.delete(`/api/v1/pipeline/${caseId}/documents?docId=${doc.id}`);
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
                                                        <button
                                                            onClick={() => handleDocumentDownload(doc.id, true)}
                                                            className="p-2 hover:bg-blue-50 rounded text-blue-600"
                                                            title="View"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDocumentDownload(doc.id, false, doc.document_name)}
                                                            className="p-2 hover:bg-blue-50 rounded text-blue-600"
                                                            title="Download"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-400">
                                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No documents uploaded</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Communication Tab */}
                            {activeTab === 'communication' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h3>

                                    {/* Add Note */}
                                    <div className="mb-6 bg-gray-50 rounded-lg p-4">
                                        <textarea
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Add a note for the team..."
                                            rows={3}
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

                                    {/* Patient Communication */}
                                    <div className="mb-6">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Patient Communication</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => window.open(`https://wa.me/${patient.phone}`)}
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                            >
                                                <Send size={18} />
                                                Send WhatsApp
                                            </button>
                                            <button
                                                onClick={() => window.open(`tel:${patient.phone}`)}
                                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                            >
                                                <Phone size={18} />
                                                Make Call
                                            </button>
                                        </div>
                                    </div>

                                    {/* Notes List */}
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Previous Notes</h4>
                                    {notes.length > 0 ? (
                                        <div className="space-y-3">
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
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            No notes yet
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Timeline Tab */}
                            {activeTab === 'timeline' && (
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
                                        <button
                                            onClick={() => setShowLogActivityModal(true)}
                                            className="px-4 py-2 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg text-sm font-medium"
                                        >
                                            Log New Activity
                                        </button>
                                    </div>

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
                                        <div className="text-center py-12 text-gray-400">
                                            <Clock size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No activities logged yet</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showLogActivityModal && (
                <LogActivityModal
                    isOpen={true}
                    onClose={() => setShowLogActivityModal(false)}
                    onSubmit={handleLogActivity}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                />
            )}
            {showRecordPaymentModal && (
                <RecordPaymentModal
                    isOpen={true}
                    onClose={() => setShowRecordPaymentModal(false)}
                    onSubmit={handleRecordPayment}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                    estimatedCost={caseData.estimated_cost}
                />
            )}
        </div>
    );
}
