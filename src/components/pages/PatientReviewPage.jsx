'use client';

import { useState } from 'react';
import axios from 'axios';
import { Star, X } from 'lucide-react';
import { toast } from 'react-toastify';

function StarRating({ value, onChange, label }) {
    return (
        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => onChange(star)}
                        className={`p-1 transition-transform hover:scale-110 ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    >
                        <Star size={32} fill={star <= value ? "currentColor" : "none"} />
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function PatientReviewPage({ patientId, surgeries, carebuddy, onClose }) {
    const [step, setStep] = useState(1);
    const [ratings, setRatings] = useState({
        overall_rating: 0, overall_review: '',
        carebuddy_rating: 0, carebuddy_review: '',
        hospital_rating: 0, hospital_review: '',
        doctor_rating: 0, doctor_review: '',
        company_rating: 0, company_review: ''
    });

    const [selectedEntities, setSelectedEntities] = useState({
        hospital_id: surgeries[0]?.hospital_id || '',
        doctor_id: surgeries[0]?.surgeon_id || '',
        carebuddy_id: carebuddy?.id || ''
    });

    const handleRating = (field, value) => {
        setRatings(prev => ({ ...prev, [field]: value }));
    };

    const handleText = (field, value) => {
        setRatings(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        try {
            await axios.post('/api/v1/reviews', {
                ...ratings,
                hospital_id: selectedEntities.hospital_id || null,
                doctor_id: selectedEntities.doctor_id || null,
                carebuddy_id: selectedEntities.carebuddy_id || null,
            });
            toast.success('Thank you for your review!');
            onClose();
            // Open Google Maps review link
            window.open('https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID', '_blank'); // Replace with actual Place ID
        } catch (error) {
            toast.error('Error submitting review');
        }
    };


    const steps = [
        {
            title: "Overall Experience",
            content: (
                <>
                    <StarRating value={ratings.overall_rating} onChange={v => handleRating('overall_rating', v)} label="How was your overall experience?" />
                    <textarea
                        className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#19ADB8]"
                        rows={3}
                        placeholder="Tell us more about your experience..."
                        value={ratings.overall_review}
                        onChange={e => handleText('overall_review', e.target.value)}
                    />
                </>
            )
        },
        {
            title: "Hospital & Surgeon",
            content: (
                <>
                    <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Hospital: {surgeries[0]?.hospital_name || 'N/A'}</p>
                        <StarRating value={ratings.hospital_rating} onChange={v => handleRating('hospital_rating', v)} label="Rate the Hospital Facilities" />
                        <textarea
                            className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#19ADB8] mb-4"
                            rows={2}
                            placeholder="Hospital feedback..."
                            value={ratings.hospital_review}
                            onChange={e => handleText('hospital_review', e.target.value)}
                        />

                        <p className="text-sm font-semibold text-gray-600 mb-2">Surgeon: {surgeries[0]?.surgeon_name || 'N/A'}</p>
                        <StarRating value={ratings.doctor_rating} onChange={v => handleRating('doctor_rating', v)} label="Rate the Doctor" />
                        <textarea
                            className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#19ADB8]"
                            rows={2}
                            placeholder="Doctor feedback..."
                            value={ratings.doctor_review}
                            onChange={e => handleText('doctor_review', e.target.value)}
                        />
                    </div>
                </>
            )
        },
        {
            title: "Care Buddy & Company",
            content: (
                <>
                    <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Care Buddy: {carebuddy?.username || 'N/A'}</p>
                        <StarRating value={ratings.carebuddy_rating} onChange={v => handleRating('carebuddy_rating', v)} label="Rate your Care Buddy" />
                        <textarea
                            className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#19ADB8] mb-4"
                            rows={2}
                            placeholder="Care Buddy feedback..."
                            value={ratings.carebuddy_review}
                            onChange={e => handleText('carebuddy_review', e.target.value)}
                        />

                        <StarRating value={ratings.company_rating} onChange={v => handleRating('company_rating', v)} label="Rate SurgiPartner Service" />
                        <textarea
                            className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#19ADB8]"
                            rows={2}
                            placeholder="Company feedback..."
                            value={ratings.company_review}
                            onChange={e => handleText('company_review', e.target.value)}
                        />
                    </div>
                </>
            )
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 font-sans">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{steps[step - 1].title}</h2>
                        <p className="text-sm text-gray-500">Step {step} of {steps.length}</p>
                    </div>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {steps[step - 1].content}
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-between gap-4">
                    <div className="flex-1">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-2 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
                            >
                                Back
                            </button>
                        )}
                    </div>
                    <div className="flex-1 flex justify-end">
                        {step < steps.length ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="px-6 py-2 bg-[#004071] text-white rounded-xl font-medium hover:bg-[#00335a]"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                className="px-6 py-2 bg-[#19ADB8] text-white rounded-xl font-bold hover:bg-[#15909a]"
                            >
                                Submit & Review on Google
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
