'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Search, User, Building2, Stethoscope, Microscope, Briefcase } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/v1/reviews');
            setReviews(response.data.reviews || []);
        } catch (error) {
            toast.error('Error fetching reviews');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const filteredReviews = reviews.filter(r =>
        r.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.surgeon_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const RatingBlock = ({ rating, review, label, icon: Icon, color }) => {
        if (!rating && !review) return null;
        return (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
                        <Icon size={16} className={color.replace('bg-', 'text-')} />
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">{label}</span>
                    <div className="ml-auto flex items-center bg-white px-2 py-0.5 rounded-md border border-gray-200">
                        <Star size={12} className="text-yellow-400 fill-yellow-400 mr-1" />
                        <span className="text-sm font-bold">{rating || '-'}</span>
                    </div>
                </div>
                {review && <p className="text-sm text-gray-600 italic">&quot;{review}&quot;</p>}
            </div>
        );
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Reviews</h1>
                    <p className="text-gray-600">{reviews.length} reviews received</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by patient, hospital, or doctor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19ADB8] focus:border-transparent"
                    />
                </div>
            </div>

            <div className="grid gap-6">
                {filteredReviews.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                        <Star size={48} className="text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No reviews found</h3>
                        <p className="text-gray-500">Reviews submitted by patients will appear here.</p>
                    </div>
                ) : (
                    filteredReviews.map((review) => (
                        <div key={review.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#004071] rounded-full flex items-center justify-center text-white font-bold">
                                        {(review.first_name?.[0] || '') + (review.last_name?.[0] || '')}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{review.first_name} {review.last_name}</h3>
                                        <p className="text-xs text-gray-500">Patient ID: {review.patient_id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span>{formatDate(review.created_at)}</span>
                                    {review.overall_rating && (
                                        <div className="hidden md:flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                                            <span className="font-semibold text-yellow-700">Overall:</span>
                                            <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                            <span className="font-bold text-gray-900">{review.overall_rating}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Review Content */}
                            <div className="p-6">
                                {review.overall_review && (
                                    <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <h4 className="text-sm font-bold text-[#004071] mb-1">Overall Experience</h4>
                                        <p className="text-gray-800">&quot;{review.overall_review}&quot;</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <RatingBlock
                                        rating={review.hospital_rating}
                                        review={review.hospital_review}
                                        label={`Hospital: ${review.hospital_name || 'N/A'}`}
                                        icon={Building2}
                                        color="text-blue-500 bg-blue-500"
                                    />
                                    <RatingBlock
                                        rating={review.doctor_rating}
                                        review={review.doctor_review}
                                        label={`Surgeon: ${review.surgeon_name || 'N/A'}`}
                                        icon={Stethoscope}
                                        color="text-green-500 bg-green-500"
                                    />
                                    <RatingBlock
                                        rating={review.carebuddy_rating}
                                        review={review.carebuddy_review}
                                        label={`Care Buddy: ${review.carebuddy_name || 'N/A'}`}
                                        icon={User}
                                        color="text-purple-500 bg-purple-500"
                                    />
                                    <RatingBlock
                                        rating={review.machine_rating}
                                        review={review.machine_review}
                                        label="Machine"
                                        icon={Microscope}
                                        color="text-orange-500 bg-orange-500"
                                    />
                                    <RatingBlock
                                        rating={review.company_rating}
                                        review={review.company_review}
                                        label="SurgiPartner"
                                        icon={Briefcase}
                                        color="text-[#19ADB8] bg-[#19ADB8]"
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
