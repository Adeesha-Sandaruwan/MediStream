import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllVerifiedDoctors, getDoctorAvailability, getMyPatientProfile } from '../api/patientApi';
import { Search, Loader2, UserRound, Award, Phone, Building, AlertCircle, Calendar, Clock, X } from 'lucide-react';

const PatientDoctorSearch = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [specialtyFilter, setSpecialtyFilter] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [availabilitySlots, setAvailabilitySlots] = useState([]);
    const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, [token]);

    useEffect(() => {
        let results = doctors;

        if (specialtyFilter !== 'ALL') {
            results = results.filter(doc => doc.specialty === specialtyFilter);
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            results = results.filter(doc => 
                (doc.firstName?.toLowerCase() || '').includes(lowerTerm) ||
                (doc.lastName?.toLowerCase() || '').includes(lowerTerm) ||
                (doc.hospitalAffiliation?.toLowerCase() || '').includes(lowerTerm)
            );
        }

        setFilteredDoctors(results);
    }, [searchTerm, specialtyFilter, doctors]);

    const fetchDoctors = async () => {
        setIsLoading(true);
        setError('');
        try {
            const verifiedDoctors = await getAllVerifiedDoctors(token);
            setDoctors(verifiedDoctors);
            setFilteredDoctors(verifiedDoctors);
        } catch (err) {
            console.error(err);
            setError('Unable to load the doctor directory. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewAvailability = async (doctor) => {
        setSelectedDoctor(doctor);
        setIsAvailabilityLoading(true);
        try {
            const slots = await getDoctorAvailability(token, doctor.email);
            const activeSlots = slots.filter(slot => slot.active);
            setAvailabilitySlots(activeSlots);
        } catch (err) {
            console.error(err);
            setAvailabilitySlots([]);
        } finally {
            setIsAvailabilityLoading(false);
        }
    };

    const handleBookAppointment = async (doctor) => {
        try {
            const patientProfile = await getMyPatientProfile(token);
            navigate('/appointments', {
                state: {
                    openCreateForm: true,
                    patientId: patientProfile.id,
                    doctorId: doctor.id,
                },
            });
        } catch (err) {
            console.error(err);
            setError('Unable to open the appointment form right now. Please try again later.');
        }
    };

    const uniqueSpecialties = ['ALL', ...new Set(doctors.map(d => d.specialty).filter(Boolean))];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
            <div className="mb-6">
                <Link to="/patient-dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium">
                    &larr; Back to Dashboard
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Find a Specialist</h1>
                <p className="text-gray-600 mt-2">Browse our directory of verified medical professionals.</p>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-8 flex items-start">
                    <AlertCircle className="mr-3 mt-0.5 shrink-0" size={20} />
                    <p>{error}</p>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or hospital..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 outline-none transition-colors"
                    />
                </div>
                <div className="md:w-64 shrink-0">
                    <select
                        value={specialtyFilter}
                        onChange={(e) => setSpecialtyFilter(e.target.value)}
                        className="block w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 outline-none font-medium text-gray-700 cursor-pointer"
                    >
                        {uniqueSpecialties.map(spec => (
                            <option key={spec} value={spec}>
                                {spec === 'ALL' ? 'All Specialties' : spec}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <p className="font-bold">Loading directory...</p>
                </div>
            ) : filteredDoctors.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                    <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Search className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Specialists Found</h3>
                    <p className="text-gray-500">We couldn't find any doctors matching your current search criteria.</p>
                    <button 
                        onClick={() => { setSearchTerm(''); setSpecialtyFilter('ALL'); }}
                        className="mt-6 text-indigo-600 font-bold hover:text-indigo-800"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredDoctors.map(doctor => (
                        <div key={doctor.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                            <div className="p-6 flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 bg-linear-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                                            <UserRound size={32} className="text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Dr. {doctor.firstName} {doctor.lastName}</h3>
                                            <span className="inline-block mt-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full tracking-wider uppercase">
                                                {doctor.specialty || 'General Practice'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mt-6">
                                    <div className="flex items-start text-gray-600">
                                        <Award className="mr-3 text-gray-400 shrink-0 mt-0.5" size={18} />
                                        <p className="text-sm"><span className="font-bold text-gray-700">Qualifications:</span> {doctor.qualifications || 'Not specified'}</p>
                                    </div>
                                    <div className="flex items-start text-gray-600">
                                        <Building className="mr-3 text-gray-400 shrink-0 mt-0.5" size={18} />
                                        <p className="text-sm"><span className="font-bold text-gray-700">Affiliation:</span> {doctor.hospitalAffiliation || 'Independent Practice'}</p>
                                    </div>
                                    <div className="flex items-start text-gray-600">
                                        <Phone className="mr-3 text-gray-400 shrink-0 mt-0.5" size={18} />
                                        <p className="text-sm"><span className="font-bold text-gray-700">Contact:</span> {doctor.phoneNumber || 'Not provided'}</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleViewAvailability(doctor)}
                                    className="mt-4 flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    <Clock className="mr-2" size={16} /> View Clinic Schedule
                                </button>
                            </div>
                            
                            <div className="bg-gray-50 p-4 border-t border-gray-100 mt-auto flex justify-between items-center">
                                <div className="text-lg font-black text-emerald-700">
                                    LKR {doctor.consultationFee || '0.00'} <span className="text-xs text-gray-500 font-medium">/ session</span>
                                </div>
                                <button
                                    onClick={() => handleBookAppointment(doctor)}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <Calendar className="mr-2" size={16} /> Book Appointment
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedDoctor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Dr. {selectedDoctor.firstName}'s Schedule</h3>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{selectedDoctor.specialty}</p>
                            </div>
                            <button onClick={() => setSelectedDoctor(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {isAvailabilityLoading ? (
                                <div className="flex justify-center items-center py-10 text-indigo-600">
                                    <Loader2 className="animate-spin" size={32} />
                                </div>
                            ) : availabilitySlots.length === 0 ? (
                                <div className="text-center py-6 text-gray-500">
                                    <Clock className="mx-auto text-gray-300 mb-3" size={32} />
                                    <p>No active availability slots posted by this doctor.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {availabilitySlots.map(slot => (
                                        <div key={slot.id} className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                            <div className="font-bold text-indigo-900 capitalize w-24">
                                                {slot.dayOfWeek}
                                            </div>
                                            <div className="text-indigo-700 font-medium">
                                                {slot.startTime} - {slot.endTime}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                            <button onClick={() => setSelectedDoctor(null)} className="w-full py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDoctorSearch;