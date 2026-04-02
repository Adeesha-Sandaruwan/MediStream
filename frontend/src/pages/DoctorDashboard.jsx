import { Link } from 'react-router-dom';
import { CalendarClock, ClipboardCheck, Stethoscope, UserRound, Video, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DoctorDashboard() {
    const { verificationStatus } = useAuth();
    const isApproved = verificationStatus === 'APPROVED';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Physician Portal</h1>
                <p className="text-gray-600">Navigate quickly to all doctor tools and workflows.</p>
            </div>

            {/* Verification Status Banner */}
            {!isApproved ? (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8 rounded-r-xl shadow-sm flex items-start">
                    <AlertCircle className="text-amber-600 mt-1 mr-4 shrink-0" size={28} />
                    <div>
                        <h3 className="text-lg font-bold text-amber-800">Account Pending Verification</h3>
                        <p className="text-amber-700 mt-1">
                            Your account is currently under administrative review. To expedite this process, please ensure your <span className="font-bold">Doctor Profile</span> is completely filled out with your valid medical license and qualifications.
                        </p>
                        <p className="text-amber-700 font-bold mt-2">Clinical tools will unlock once approved.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-green-50 border border-green-200 p-4 mb-8 rounded-xl shadow-sm flex items-center">
                    <CheckCircle2 className="text-green-600 mr-3 shrink-0" size={24} />
                    <p className="text-green-800 font-bold">Your physician credentials are verified and active.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* ALWAYS UNLOCKED: Doctor Profile */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 ring-2 ring-blue-50">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><UserRound size={24} /></div>
                        <h2 className="ml-4 text-xl font-semibold text-gray-800">Doctor Profile</h2>
                    </div>
                    <p className="text-gray-600 mb-6 h-12">Manage your professional details, specialty, and consultation information.</p>
                    <Link to="/doctor-profile" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                        Manage Profile
                    </Link>
                </div>

                {/* LOCKED CARDS */}
                <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 transition-all duration-300 ${!isApproved ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:shadow-xl'}`}>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg"><CalendarClock size={24} /></div>
                        <h2 className="ml-4 text-xl font-semibold text-gray-800">Availability</h2>
                    </div>
                    <p className="text-gray-600 mb-6 h-12">Create and maintain your clinic schedule and available consultation slots.</p>
                    {isApproved ? (
                        <Link to="/doctor-availability" className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">Manage Availability</Link>
                    ) : (
                        <button disabled className="block w-full text-center bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded-lg cursor-not-allowed">Locked</button>
                    )}
                </div>

                <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 transition-all duration-300 ${!isApproved ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:shadow-xl'}`}>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-amber-100 text-amber-700 rounded-lg"><ClipboardCheck size={24} /></div>
                        <h2 className="ml-4 text-xl font-semibold text-gray-800">Appointments</h2>
                    </div>
                    <p className="text-gray-600 mb-6 h-12">Review patient requests and approve or reject appointments confidently.</p>
                    {isApproved ? (
                        <Link to="/doctor-appointments" className="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">Review Appointments</Link>
                    ) : (
                        <button disabled className="block w-full text-center bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded-lg cursor-not-allowed">Locked</button>
                    )}
                </div>

                <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 transition-all duration-300 ${!isApproved ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:shadow-xl'}`}>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-violet-100 text-violet-700 rounded-lg"><Stethoscope size={24} /></div>
                        <h2 className="ml-4 text-xl font-semibold text-gray-800">Prescriptions</h2>
                    </div>
                    <p className="text-gray-600 mb-6 h-12">Issue digital prescriptions and track clinical advice for follow-up care.</p>
                    {isApproved ? (
                        <Link to="/doctor-prescriptions" className="block w-full text-center bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">Manage Prescriptions</Link>
                    ) : (
                        <button disabled className="block w-full text-center bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded-lg cursor-not-allowed">Locked</button>
                    )}
                </div>

                <div className={`md:col-span-2 xl:col-span-2 rounded-xl shadow-md p-6 border transition-all duration-300 ${!isApproved ? 'bg-gray-100 border-gray-300 opacity-60 grayscale cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-500 text-white'}`}>
                    <div className="flex items-center mb-4">
                        <div className={`p-3 rounded-lg ${!isApproved ? 'bg-gray-300 text-gray-500' : 'bg-white/20 text-white'}`}>
                            <Video size={24} />
                        </div>
                        <h2 className={`ml-4 text-xl font-semibold ${!isApproved ? 'text-gray-800' : 'text-white'}`}>Telemedicine</h2>
                    </div>
                    <p className={`${!isApproved ? 'text-gray-600' : 'text-emerald-50'} mb-6 h-12`}>Launch secure live consultations and continue care through video sessions.</p>
                    {isApproved ? (
                        <Link to="/telemedicine" className="block w-full sm:w-auto text-center bg-white text-teal-700 hover:bg-emerald-50 font-semibold py-2 px-6 rounded-lg transition-colors">Open Telemedicine</Link>
                    ) : (
                        <button disabled className="block w-full sm:w-auto text-center bg-gray-300 text-gray-500 font-semibold py-2 px-6 rounded-lg cursor-not-allowed">Locked</button>
                    )}
                </div>
            </div>
        </div>
    );
}