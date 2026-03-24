'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/constants';
import { Building2, MapPin, Phone, Mail, User2Icon, Award, Percent, Activity, ArrowLeft, Calendar, Stethoscope, Clock, Briefcase, Package, Receipt } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-toastify';

export default function HospitalDetailPage({ id }) {
    const router = useRouter();
    const pathname = usePathname();
    const role = pathname?.split('/')[1] || 'admin';
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchHospitalDetails = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_ENDPOINTS.HOSPITALS}?id=${id}`);
            if (response.data.hospital) {
                setHospital(response.data.hospital);
            }
        } catch (error) {
            toast.error('Error fetching hospital details');
            router.push(`/${role}/hospitals`);
        } finally {
            setLoading(false);
        }
    }, [id, router, role]);

    useEffect(() => {
        if (id) {
            fetchHospitalDetails();
        }
    }, [id, fetchHospitalDetails]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#19ADB8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                </div>
            </div>
        );
    }

    if (!hospital) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header / Back Button */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-600 hover:text-[#004071] transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Hospitals
                </button>
            </div>

            {/* Hospital Overview Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Icon/Logo */}
                    <div className="w-24 h-24 bg-teal-50 rounded-2xl flex items-center justify-center shrink-0">
                        <Building2 className="text-[#004071] w-12 h-12" />
                    </div>

                    {/* Main Info */}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{hospital.name}</h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                                        {hospital.hospital_type}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full font-medium ${hospital.partnership_status === 'Active' ? 'bg-green-50 text-green-700' :
                                        hospital.partnership_status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {hospital.partnership_status}
                                    </span>
                                </div>
                            </div>

                            {/* Commission */}
                            {hospital.commission_rate && (
                                <div className="text-right bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100">
                                    <div className="text-xs text-blue-600 font-medium mb-1">Commission Rate</div>
                                    <div className="text-2xl font-bold text-blue-900">{hospital.commission_rate}%</div>
                                </div>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            <div className="space-y-3">
                                <div className="flex items-start text-gray-600">
                                    <MapPin className="w-5 h-5 mr-3 text-[#19ADB8] shrink-0 mt-0.5" />
                                    <span>{hospital.address}, {hospital.city}, {hospital.state} - {hospital.pin_code}</span>
                                </div>
                                {hospital.phone && (
                                    <div className="flex items-center text-gray-600">
                                        <Phone className="w-5 h-5 mr-3 text-[#19ADB8]" />
                                        <span>{hospital.phone}</span>
                                    </div>
                                )}
                                {hospital.email && (
                                    <div className="flex items-center text-gray-600">
                                        <Mail className="w-5 h-5 mr-3 text-[#19ADB8]" />
                                        <span>{hospital.email}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                {hospital.contact_person && (
                                    <div className="flex items-start text-gray-600">
                                        <User2Icon className="w-5 h-5 mr-3 text-[#19ADB8] shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-gray-900">{hospital.contact_person}</p>
                                            <p className="text-sm text-gray-500">{hospital.contact_person_phone}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Total Beds</div>
                                    <div className="text-lg font-semibold">{hospital.total_beds || '-'}</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">ICU Beds</div>
                                    <div className="text-lg font-semibold">{hospital.icu_beds || '-'}</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">OTs</div>
                                    <div className="text-lg font-semibold">{hospital.operation_theatres || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Accreditations */}
                {hospital.accreditations && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#19ADB8]" />
                            Accreditations
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {hospital.accreditations.split(',').map((acc, idx) => (
                                <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-sm font-medium">
                                    {acc.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Surgeons Section */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Stethoscope className="text-[#004071]" />
                    Associated Surgeons
                </h2>

                {!hospital.surgeons || hospital.surgeons.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <User2Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No surgeons listed</h3>
                        <p className="text-gray-500 mt-1">There are no surgeons associated with this hospital yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {hospital.surgeons.map((surgeon, index) => (
                            <div key={index} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col md:flex-row h-full">
                                {/* Surgeon Image / Placeholder */}
                                <div className="w-full md:w-32 bg-gray-100 shrink-0 flex items-center justify-center md:border-r border-gray-100 relative h-48 md:h-full overflow-hidden">
                                    {surgeon.image ? (
                                        <Image
                                            src={surgeon.image}
                                            alt={surgeon.name}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <User2Icon className="w-12 h-12 text-gray-300" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">{surgeon.name}</h3>
                                        <p className="text-[#19ADB8] font-medium text-sm mb-3">
                                            {surgeon.designation || 'Surgeon'}
                                            {surgeon.department && <span className="text-gray-400 font-normal"> • {surgeon.department}</span>}
                                        </p>
                                    </div>

                                    <div className="space-y-2 mt-auto">
                                        {surgeon.experience && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                                                <span>{surgeon.experience} Experience</span>
                                            </div>
                                        )}
                                        {surgeon.available_timings && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                                <span>{surgeon.available_timings}</span>
                                            </div>
                                        )}
                                        {surgeon.phone && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                <span>{surgeon.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Consumables Inventory Section */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="text-[#004071]" />
                        Consumables Inventory
                    </h2>
                    <div className="flex items-center gap-3">
                        {hospital.consumables && hospital.consumables.some(c => c.status === 'Unbilled') && (
                            <button
                                onClick={() => router.push(`/${role}/billing?action=generate&hospital_id=${hospital.id}&bill_type=consumables`)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#19ADB8] text-white text-sm font-medium rounded-lg hover:bg-[#17a0ab] shadow-sm"
                            >
                                <Receipt size={16} />
                                Generate Invoice
                            </button>
                        )}
                        {hospital.consumables && hospital.consumables.length > 0 && (
                            <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                                Total Value: <span className="font-bold text-gray-900 ml-1">₹{hospital.consumables.reduce((acc, c) => acc + Number(c.total_amount), 0).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {hospital.consumables && hospital.consumables.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                                <tr>
                                    <th className="p-4">Item</th>
                                    <th className="p-4">Assigned Date</th>
                                    <th className="p-4">Quantity</th>
                                    <th className="p-4">Unit Price</th>
                                    <th className="p-4">Total</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {hospital.consumables.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{item.item_name}</div>
                                            <div className="text-xs text-gray-500">{item.sku}</div>
                                        </td>
                                        <td className="p-4 text-gray-500">
                                            {new Date(item.assigned_date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 font-medium text-gray-900">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            ₹{Number(item.selling_price).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-bold text-[#004071]">
                                            ₹{Number(item.total_amount).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.status === 'Billed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                        <p className="text-gray-500">No consumables assigned to this hospital yet.</p>
                    </div>
                )}
            </div>

            {/* Associated Patients Section */}
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <User2Icon className="text-[#004071]" />
                    Associated Patients
                </h2>
                {!hospital.assigned_patients || hospital.assigned_patients.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                        <p className="text-gray-500">No patients associated with this hospital yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Surgery Type</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Surgeon</th>
                                    <th className="p-4">Phone</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {hospital.assigned_patients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">
                                            {patient.first_name} {patient.last_name}
                                        </td>
                                        <td className="p-4">{patient.surgery_type}</td>
                                        <td className="p-4">
                                            {patient.surgery_date ? new Date(patient.surgery_date).toLocaleDateString('en-IN') : '-'}
                                        </td>
                                        <td className="p-4">{patient.surgeon_name || '-'}</td>
                                        <td className="p-4">{patient.phone || '-'}</td>
                                        <td className="p-4 text-xs font-semibold uppercase text-gray-500">
                                            {patient.status ? (
                                                <span className={`px-2 py-1 rounded-full ${patient.status.includes('completed') || patient.status.includes('done') ? 'bg-green-100 text-green-700' :
                                                    patient.status.includes('cancel') ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {patient.status.replace('_', ' ')}
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Associated Machines Section */}
            <div className="mt-12 mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="text-[#004071]" />
                        Assigned Machines
                    </h2>
                    <div className="flex items-center gap-3">
                        {hospital.assigned_machines && hospital.assigned_machines.some(m => m.status === 'Available') && (
                            <button
                                onClick={() => router.push(`/${role}/billing?action=generate&hospital_id=${hospital.id}&bill_type=machines`)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#19ADB8] text-white text-sm font-medium rounded-lg hover:bg-[#17a0ab] shadow-sm"
                            >
                                <Receipt size={16} />
                                Generate Invoice
                            </button>
                        )}
                    </div>
                </div>
                {!hospital.assigned_machines || hospital.assigned_machines.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                        <p className="text-gray-500">No machines assigned to this hospital yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
                                <tr>
                                    <th className="p-4">Machine Name</th>
                                    <th className="p-4">Serial Number</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Rental Start</th>
                                    <th className="p-4">Rental End</th>
                                    <th className="p-4">Rental Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {hospital.assigned_machines.map((machine) => (
                                    <tr key={machine.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-900">{machine.machine_name}</td>
                                        <td className="p-4">{machine.serial_number}</td>
                                        <td className="p-4">{machine.category}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${machine.type === 'For Sale' ? 'bg-emerald-50 text-emerald-700' : 'bg-cyan-50 text-cyan-700'
                                                }`}>
                                                {machine.type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${machine.status === 'Available' ? 'bg-green-50 text-green-700' :
                                                machine.status === 'Rented' ? 'bg-blue-50 text-blue-700' :
                                                    machine.status === 'Sold' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {machine.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500">
                                            {machine.rental_start_date ? new Date(machine.rental_start_date).toLocaleDateString('en-IN') : '-'}
                                        </td>
                                        <td className="p-4 text-gray-500">
                                            {machine.rental_end_date ? new Date(machine.rental_end_date).toLocaleDateString('en-IN') : '-'}
                                        </td>
                                        <td className="p-4 font-medium text-gray-900">
                                            {machine.rental_price ? `₹${Number(machine.rental_price).toLocaleString('en-IN')}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
