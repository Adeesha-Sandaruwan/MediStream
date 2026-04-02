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

    const handleLogout = () => {
        logout();
    };

    return (
        <nav className="bg-blue-800 text-white p-4 flex justify-between items-center shadow-md">
            <div className="text-xl font-bold tracking-wider">
                MediStream <span className="text-sm font-normal text-blue-200 ml-2">[{role || 'USER'}]</span>
            </div>
            <button 
                onClick={handleLogout} 
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold transition-colors duration-300"
            >
                Logout
            </button>
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

                {/* Shared Routes */}
                <Route path="/telemedicine" element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']} requireVerified={true}><Telemedicine /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}