import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Auth from './pages/Auth';
import MedicalProfile from './pages/MedicalProfile';
import PatientDashboard from './pages/PatientDashboard';
import Telemedicine from './pages/Telemedicine';
import { useAuth } from './context/AuthContext';
import MedicalReports from './pages/MedicalReports';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorProfile from './pages/DoctorProfile';
import DoctorAvailability from './pages/DoctorAvailability';
import DoctorAppointments from './pages/DoctorAppointments';
import DoctorPrescriptions from './pages/DoctorPrescriptions';
import PatientDoctorSearch from './pages/PatientDoctorSearch';
import PatientPrescriptions from './pages/PatientPrescriptions';
import { Activity, LogOut } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles, requireVerified }) => {
    const { token, role, verificationStatus } = useAuth();
    
    if (!token) {
        return <Navigate to="/auth" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }
    // Hard Lockdown: If feature requires verification, and user is a Doctor who is NOT approved, bounce them.
    // (Patients are bypassed here since they don't require verification)
    if (requireVerified && role === 'DOCTOR' && verificationStatus !== 'APPROVED') {
        return <Navigate to="/doctor-dashboard" replace />;
    }
    
    return children;
};

const Navbar = () => {
    const { logout, role } = useAuth();

    return (
        <nav className="sticky top-0 z-50 w-full bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white shadow-xl border-b border-white/10 backdrop-blur-md bg-opacity-95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    
                    {/* Brand / Logo Section */}
                    <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                            <Activity size={24} className="text-white" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-2xl font-black tracking-wide leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
                                MediStream
                            </span>
                            <span className="text-[11px] font-bold text-blue-300 tracking-[0.2em] uppercase mt-1">
                                {role || 'USER'} PORTAL
                            </span>
                        </div>
                    </div>

                    {/* Actions Section */}
                    <button 
                        onClick={logout} 
                        className="group flex items-center space-x-2 bg-white/10 hover:bg-red-500 text-blue-50 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border border-white/10 hover:border-red-400 hover:shadow-lg hover:shadow-red-500/40"
                    >
                        <span>Sign Out</span>
                        <LogOut size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </button>

                </div>
            </div>
        </nav>
    );
};

const RootRouter = () => {
    const { role } = useAuth();
    
    if (role === 'DOCTOR') return <Navigate to="/doctor-dashboard" replace />;
    if (role === 'ADMIN') return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/patient-dashboard" replace />;
};

export default function App() {
    const { token } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            {token && <Navbar />}
            
            <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><RootRouter /></ProtectedRoute>} />

                {/* Patient Routes */}
                <Route path="/patient-dashboard" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} />
                <Route path="/profile" element={
                    <ProtectedRoute allowedRoles={['PATIENT']}>
                        <div className="py-6">
                            <div className="max-w-7xl mx-auto px-4 mb-6">
                                <Link to="/patient-dashboard" className="text-blue-600 hover:text-blue-800 font-medium">&larr; Back to Dashboard</Link>
                            </div>
                            <MedicalProfile />
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/reports" element={
                    <ProtectedRoute allowedRoles={['PATIENT']}>
                        <div className="py-6">
                            <div className="max-w-7xl mx-auto px-4 mb-6">
                                <Link to="/patient-dashboard" className="text-blue-600 hover:text-blue-800 font-medium">&larr; Back to Dashboard</Link>
                            </div>
                            <MedicalReports />
                        </div>
                    </ProtectedRoute>
                } />

                {/* Doctor Routes */}
                <Route path="/doctor-dashboard" element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorDashboard /></ProtectedRoute>} />
                
                {/* Profile does NOT require verification (so they can fill it out) */}
                <Route path="/doctor-profile" element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorProfile /></ProtectedRoute>} />
                
                {/* These require verification! */}
                <Route path="/doctor-availability" element={<ProtectedRoute allowedRoles={['DOCTOR']} requireVerified={true}><DoctorAvailability /></ProtectedRoute>} />
                <Route path="/doctor-appointments" element={<ProtectedRoute allowedRoles={['DOCTOR']} requireVerified={true}><DoctorAppointments /></ProtectedRoute>} />
                <Route path="/doctor-prescriptions" element={<ProtectedRoute allowedRoles={['DOCTOR']} requireVerified={true}><DoctorPrescriptions /></ProtectedRoute>} />

                <Route path="/patient-doctors" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDoctorSearch /></ProtectedRoute>} />

                <Route path="/patient-prescriptions" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientPrescriptions /></ProtectedRoute>} />
                
                {/* Shared Routes */}
                <Route path="/telemedicine" element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']} requireVerified={true}><Telemedicine /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}