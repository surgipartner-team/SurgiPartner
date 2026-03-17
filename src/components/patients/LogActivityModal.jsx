'use client';

import { useState } from 'react';
import { X, Phone, Mail, MessageSquare, Video, FileText, CheckCircle } from 'lucide-react';

export default function LogActivityModal({ isOpen, onClose, patientName, onSubmit }) {
    const [selectedType, setSelectedType] = useState('phone_call');
    const [formData, setFormData] = useState({
        description: '',
        duration_minutes: '',
        outcome: '',
        additional_notes: ''
    });
    const [loading, setLoading] = useState(false);

    const activityTypes = [
        { id: 'phone_call', label: 'Phone Call', icon: Phone, color: 'bg-teal-100 text-teal-600' },
        { id: 'email', label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-600' },
        { id: 'message_sms', label: 'Message/SMS', icon: MessageSquare, color: 'bg-green-100 text-green-600' },
        { id: 'meeting_video', label: 'Meeting/Video Call', icon: Video, color: 'bg-purple-100 text-purple-600' },
        { id: 'note', label: 'Note', icon: FileText, color: 'bg-gray-100 text-gray-600' },
        { id: 'task_completed', label: 'Task Completed', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    ];

    const quickSelectOptions = {
        phone_call: ['Discussed treatment plan', 'Answered questions', 'Scheduled appointment', 'Follow-up call'],
        email: ['Sent appointment confirmation', 'Sent pre-op checklist', 'Sent discharge instructions', 'Sent follow-up reminders'],
        message_sms: ['Sent appointment reminder', 'Sent pre-op instructions', 'Sent medication reminders', 'Sent follow-up date'],
        meeting_video: ['Video consultation completed', 'In-person consultation', 'Pre-operative counseling', 'Post-operative review'],
        note: ['Patient condition update', 'Medical history recorded', 'Special instructions noted', 'Recovery progress documented'],
        task_completed: ['Pre-op clearance obtained', 'Documents collected', 'Insurance verified', 'Payment received']
    };

    const placeholders = {
        phone_call: 'What happened during this phone call?',
        email: 'What happened during this email?',
        message_sms: 'What happened during this message/sms?',
        meeting_video: 'What happened during this meeting/video call?',
        note: 'What happened during this note?',
        task_completed: 'What happened during this task completed?'
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const activityData = {
            activity_type: selectedType,
            description: formData.description,
            duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
            outcome: formData.outcome || null,
            additional_notes: formData.additional_notes || null
        };

        await onSubmit(activityData);

        // Reset form
        setSelectedType('phone_call');
        setFormData({
            description: '',
            duration_minutes: '',
            outcome: '',
            additional_notes: ''
        });
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Log Activity</h2>
                        <p className="text-sm text-gray-600 mt-1">Record an interaction or note for {patientName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Activity Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {activityTypes.map((type) => {
                                const Icon = type.icon;
                                const isSelected = selectedType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setSelectedType(type.id)}
                                        className={`p-4 rounded-xl border-2 transition-all ${isSelected
                                                ? 'border-[#19ADB8] bg-[#19ADB8]/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className={`p-3 rounded-full ${isSelected ? type.color : 'bg-gray-100'}`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{type.label}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
                        <div className="flex flex-wrap gap-2">
                            {quickSelectOptions[selectedType]?.map((option, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, description: option })}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8]"
                            placeholder={placeholders[selectedType]}
                            required
                        />
                    </div>

                    {/* Additional Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                        <textarea
                            value={formData.additional_notes}
                            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19ADB8] resize-none"
                            rows={3}
                            placeholder="Add any additional details, next steps, or important information..."
                        />
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-white text-xs font-bold">i</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-900">Activity will be visible to:</p>
                                <p className="text-sm text-blue-700 mt-1">All team members with access to this patient&apos;s record</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.description}
                            className="px-6 py-2.5 bg-[#19ADB8] hover:bg-[#17a0ab] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Logging...' : 'Log Activity'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
