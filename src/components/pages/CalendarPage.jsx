'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { toast } from 'react-toastify';
import { usePermissions } from '@/hooks/usePermissions';
import CustomSelect from '@/components/layouts/CustomSelect';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
    const router = useRouter();
    const { user } = usePermissions();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [eventsByDate, setEventsByDate] = useState({});
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewType, setViewType] = useState('patients'); // 'patients' or 'machines'

    const fetchCalendarEvents = useCallback(async () => {
        try {
            setLoading(true);
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            const response = await axios.get(`/api/v1/calendar?month=${month}&year=${year}&type=${viewType}`);
            setEventsByDate(response.data.eventsByDate || {});
            setUpcomingEvents(response.data.upcomingEvents || []);
        } catch (error) {
            console.error('Calendar Fetch Error:', error);
            toast.error(error.response?.data?.message || 'Error fetching calendar events');
        } finally {
            setLoading(false);
        }
    }, [currentDate, viewType]);

    /* checkAuth and redundant duplicate useEffect have been removed */
    useEffect(() => { if (user) fetchCalendarEvents(); }, [user, fetchCalendarEvents]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const getEventsForDate = (date) => {
        if (!date) return [];
        // Use local time for YYYY-MM-DD to match backend keys
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        const dateStr = localDate.toISOString().split('T')[0];
        return eventsByDate[dateStr] || [];
    };

    const isToday = (date) => {
        if (!date) return false;
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date) => {
        if (!date) return false;
        return date.toDateString() === selectedDate.toDateString();
    };

    const getEventColor = (type) => {
        const colors = {
            // Patient View Colors
            consultation: 'bg-blue-500',
            general_consultation: 'bg-sky-500',
            surgery: 'bg-green-600',
            ot_scheduled: 'bg-purple-500',

            // Machine View Colors
            rental_end: 'bg-amber-500',
            warranty_expiry: 'bg-red-500',
            maintenance: 'bg-indigo-500',

            // Leads View Colors
            lead_followup: 'bg-amber-500',
            lead_consulted: 'bg-green-600'
        };
        return colors[type] || 'bg-gray-500';
    };

    const getEventLabel = (type) => {
        const labels = {
            consultation: 'Consultation (Surg)',
            general_consultation: 'Consultation',
            surgery: 'Surgery',
            ot_scheduled: 'OT Scheduled',
            rental_end: 'Rental Ends',
            warranty_expiry: 'Warranty Exp',
            maintenance: 'Maintenance',
            lead_followup: 'Follow-up',
            lead_consulted: 'Consulted'
        };
        return labels[type] || type;
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleEventClick = (event) => {
        if (!user) return;

        if (viewType === 'machines') {
            if (event.machine_id) router.push('/admin/machines');
        } else if (viewType === 'leads') {
        } else {
            // Patients view
            if (event.type === 'general_consultation') {
                if (event.case_id) {
                    router.push(`/${user.role}/pipeline/${event.case_id}`);
                }
            } else {
                if (event.case_id) {
                    router.push(`/${user.role}/pipeline/${event.case_id}`);
                }
            }
        }
    };

    const days = getDaysInMonth(currentDate);
    const selectedDateEvents = getEventsForDate(selectedDate);

    // Initial load check can be removed or kept simple
    if (loading && Object.keys(eventsByDate).length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading calendar...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {viewType === 'patients' ? 'Patient Calendar' : viewType === 'machines' ? 'Machine Calendar' : 'Leads Calendar'}
                    </h1>
                    <p className="text-gray-600">{upcomingEvents.length} upcoming events this week</p>
                </div>
                <div className="flex gap-3">
                    {/* View Toggle */}
                    <div className="w-48">
                        <CustomSelect
                            value={viewType}
                            onChange={(val) => setViewType(val)}
                            options={[
                                { value: 'patients', label: 'Patients View' },
                                { value: 'machines', label: 'Machines View' },
                                { value: 'leads', label: 'Leads View' }
                            ]}
                            placeholder="Select View"
                        />
                    </div>

                    <button
                        onClick={() => user && router.push(`/${user.role}/pipeline`)}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#004071] text-[#004071] rounded-xl font-medium hover:bg-gray-50"
                    >
                        <List size={20} />
                        Pipeline View
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToToday}
                                    className="px-4 py-2 text-sm font-medium text-[#004071] hover:bg-gray-100 rounded-lg"
                                >
                                    Today
                                </button>
                                <button
                                    onClick={goToPreviousMonth}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={goToNextMonth}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {DAYS.map(day => (
                                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {days.map((date, index) => {
                                const events = getEventsForDate(date);
                                const hasEvents = events.length > 0;

                                return (
                                    <div
                                        key={index}
                                        onClick={() => date && setSelectedDate(date)}
                                        className={`
                                            min-h-[auto] aspect-square md:aspect-auto md:min-h-[100px] p-1 md:p-2 border rounded-lg cursor-pointer transition-all flex flex-col items-center md:items-start justify-start
                                            ${!date ? 'bg-gray-50 cursor-default' : ''}
                                            ${isToday(date) ? 'border-[#19ADB8] border-2 bg-blue-50' : 'border-gray-200'}
                                            ${isSelected(date) ? 'ring-2 ring-[#004071]' : ''}
                                            ${date && !isToday(date) ? 'hover:bg-gray-50' : ''}
                                        `}
                                    >
                                        {date && (
                                            <>
                                                <div className={`text-sm font-medium mb-1 ${isToday(date) ? 'text-[#004071]' : 'text-gray-900'}`}>
                                                    {date.getDate()}
                                                </div>
                                                {hasEvents && (
                                                    <>
                                                        <div className="md:hidden mt-1">
                                                            <div className="w-2 h-2 rounded-full bg-green-500 mx-auto"></div>
                                                        </div>
                                                        <div className="hidden md:block space-y-1 w-full">
                                                            {events.slice(0, 2).map((event, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`text-xs px-2 py-1 rounded text-white truncate ${getEventColor(event.type)}`}
                                                                    title={event.title}
                                                                >
                                                                    {viewType === 'machines' ? event.title : (event.patient_name || event.title)}
                                                                </div>
                                                            ))}
                                                            {events.length > 2 && (
                                                                <div className="text-xs text-gray-500 px-2">
                                                                    +{events.length - 2} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Selected Date Details */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarIcon size={20} className="text-[#004071]" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                {formatDate(selectedDate)}
                            </h3>
                        </div>

                        {selectedDateEvents.length > 0 ? (
                            <div className="space-y-3">
                                {selectedDateEvents.map((event, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleEventClick(event)}
                                        className="p-4 border border-gray-200 rounded-lg hover:border-[#19ADB8] hover:shadow-md transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-2 h-2 rounded-full ${getEventColor(event.type)}`}></div>
                                            <span className="text-xs font-medium text-gray-600 uppercase">
                                                {getEventLabel(event.type)}
                                            </span>
                                            {event.time !== 'All Day' && (
                                                <span className="text-xs text-gray-500">{event.time}</span>
                                            )}
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-1">{event.patient_name || event.title}</h4>
                                        <p className="text-sm text-[#004071] mb-2">{event.details || event.surgery_type}</p>

                                        {/* Dynamic details based on view */}
                                        {viewType === 'patients' && (
                                            <div className="space-y-1 mt-2 pt-2 border-t border-gray-100">
                                                {event.surgeon_name && (
                                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                                        <span className="font-medium">Surgeon:</span> Dr. {event.surgeon_name}
                                                    </p>
                                                )}
                                                {event.hospital_name && (
                                                    <p className="text-xs text-gray-600 flex items-center gap-2">
                                                        <span className="font-medium">Hospital:</span> {event.hospital_name}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No events for this date</p>
                            </div>
                        )}
                    </div>

                    {/* Upcoming This Week */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming This Week</h3>

                        {upcomingEvents.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingEvents.slice(0, 5).map((event, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleEventClick(event)}
                                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-2 h-2 rounded-full ${getEventColor(event.type)}`}></div>
                                            <span className="text-xs font-medium text-gray-600">
                                                {new Date(event.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">{event.title || event.patient_name}</p>
                                        <p className="text-xs text-gray-600">{event.details || event.surgery_type}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                No upcoming events
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
