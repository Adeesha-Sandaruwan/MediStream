import React from 'react';
import { Link } from 'react-router-dom';
import { User, FileText, Calendar } from 'lucide-react';

const PatientDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Patient Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Feature 1: Medical Profile (Active) */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <User size={24} />
                        </div>
                        <h2 className="ml-4 text-xl font-semibold text-gray-800">Medical Profile</h2>
                    </div>
                    <p className="text-gray-600 mb-6 h-12">Update your personal details, blood group, allergies, and emergency contacts.</p>
                    <Link 
                        to="/profile" 
                        className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                        Manage Profile
                    </Link>
                </div>

              {/* Feature 2: Medical Reports (Active!) */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                            <FileText size={24} />
                        </div>
                        <h2 className="ml-4 text-xl font-semibold text-gray-800">Medical Reports</h2>
                    </div>
                    <p className="text-gray-600 mb-6 h-12">Upload and manage your lab reports and medical documents.</p>
                    <Link 
                        to="/reports" 
                        className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm"
                    >
                        View Reports
                    </Link>
                </div>
                {/* Feature 3: Appointments (For your teammate) */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 opacity-80">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <Calendar size={24} />
                        </div>
                        <h2 className="ml-4 text-xl font-semibold text-gray-800">Appointments</h2>
                    </div>
                    <p className="text-gray-600 mb-6 h-12">Book and manage video consultations with doctors.</p>
                    <button disabled className="block w-full text-center bg-gray-200 text-gray-500 font-medium py-2 px-4 rounded-lg cursor-not-allowed">
                        Coming Soon
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PatientDashboard;