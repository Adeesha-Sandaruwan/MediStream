import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyPrescriptionsAsPatient } from '../api/patientApi';
import { Link } from 'react-router-dom';
import { Loader2, Pill, User, Calendar, Activity, AlertCircle } from 'lucide-react';

const PatientPrescriptions = () => {
    const { token } = useAuth();
    const [prescriptions, setPrescriptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPrescriptions();
    }, [token]);

    const fetchPrescriptions = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getMyPrescriptionsAsPatient(token);
            // Sort by most recent first
            const sortedData = data.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
            setPrescriptions(sortedData);
        } catch (err) {
            console.error(err);
            setError('Could not connect to the Doctor Service to retrieve prescriptions.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="mb-6">
                <Link to="/patient-dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium">
                    &larr; Back to Dashboard
                </Link>
            </div>

            <div className="flex items-center mb-8">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
                    <Pill size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Prescriptions</h1>
                    <p className="text-gray-600">Review clinical advice and medications issued by your doctors.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-center">
                    <AlertCircle className="mr-2 shrink-0" size={20} />
                    <p>{error}</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col justify-center items-center py-20 text-gray-500">
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <p className="font-medium">Retrieving medical records...</p>
                </div>
            ) : prescriptions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Pill className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Prescriptions Found</h3>
                    <p className="text-gray-500">You do not have any digital prescriptions on file at this time.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {prescriptions.map((rx) => (
                        <div key={rx.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                            <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex justify-between items-center">
                                <div className="flex items-center text-purple-900 font-bold">
                                    <Calendar className="mr-2" size={18} />
                                    Issued: {new Date(rx.issuedAt).toLocaleDateString()}
                                </div>
                                <div className="flex items-center text-gray-600 text-sm font-medium">
                                    <User className="mr-1" size={16} /> {rx.doctorEmail}
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                        <Activity className="mr-2" size={16} /> Diagnosis
                                    </h4>
                                    <p className="text-lg font-bold text-gray-900">{rx.diagnosis}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Medications</h4>
                                        <p className="text-gray-800 whitespace-pre-line leading-relaxed">{rx.medications}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <h4 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Doctor's Advice</h4>
                                        <p className="text-gray-800 whitespace-pre-line leading-relaxed">{rx.advice || 'No additional advice provided.'}</p>
                                    </div>
                                </div>

                                {rx.followUpDate && (
                                    <div className="pt-4 border-t border-gray-100 text-sm">
                                        <span className="font-bold text-gray-700">Follow-up Recommended: </span>
                                        <span className="text-amber-600 font-bold">{new Date(rx.followUpDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientPrescriptions;