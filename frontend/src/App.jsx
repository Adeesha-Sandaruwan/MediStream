import { Routes, Route, Navigate, Link, NavLink } from 'react-router-dom';
import Auth from './pages/Auth';
import MedicalProfile from './pages/MedicalProfile';
import PatientDashboard from './pages/PatientDashboard';
import Telemedicine from './pages/Telemedicine';
import { useAuth } from './context/AuthContext';
import MedicalReports from './pages/MedicalReports';
import AdminDashboard from './pages/AdminDashboard';
import Appointments from './components/appointments';
import Notifications from './components/Notifications';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorProfile from './pages/DoctorProfile';
import DoctorAvailability from './pages/DoctorAvailability';
import DoctorAppointments from './pages/DoctorAppointments';
import DoctorPrescriptions from './pages/DoctorPrescriptions';
import PatientDoctorSearch from './pages/PatientDoctorSearch';
import PatientPrescriptions from './pages/PatientPrescriptions';
import PatientAppointments from './pages/PatientAppointments';
import { Activity, LogOut } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles, requireVerified }) => {
    const { token, role, verificationStatus } = useAuth();
    
    if (!token) {
        return <Navigate to="/auth" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }
    if (requireVerified && role === 'DOCTOR' && verificationStatus !== 'APPROVED') {
        return <Navigate to="/doctor-dashboard" replace />;
    }
    
    return children;
};

const Navbar = () => {
    const { logout, role } = useAuth();

    const navItemsByRole = {
        PATIENT: [
            { to: '/patient-dashboard', label: 'Dashboard' },
            { to: '/patient-appointments', label: 'My Appointments' },
            { to: '/patient-doctors', label: 'Find Doctors' },
            { to: '/patient-prescriptions', label: 'Prescriptions' },
            { to: '/profile', label: 'Profile' },
            { to: '/reports', label: 'Reports' },
        ],
        DOCTOR: [
            { to: '/doctor-dashboard', label: 'Dashboard' },
            { to: '/doctor-appointments', label: 'Appointments' },
            { to: '/doctor-availability', label: 'Availability' },
            { to: '/doctor-prescriptions', label: 'Prescriptions' },
            { to: '/doctor-profile', label: 'Profile' },
        ],
        ADMIN: [
            { to: '/admin-dashboard', label: 'Dashboard' },
            { to: '/appointments', label: 'Appointments' },
            { to: '/notifications', label: 'Notifications' },
            { to: '/admin-dashboard', label: 'System Settings' },
        ],
    };

    const navItems = navItemsByRole[role] || [];

    return (
        <nav className="sticky top-0 z-50 w-full bg-linear-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white shadow-xl border-b border-white/10 backdrop-blur-md bg-opacity-95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3 py-4 md:h-20 md:flex-row md:items-center md:justify-between md:py-0">
                    <div className="flex items-center space-x-4">
                        <div className="bg-linear-to-br from-blue-400 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                            <Activity size={24} className="text-white" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-2xl font-black tracking-wide leading-none bg-clip-text text-transparent bg-linear-to-r from-white to-blue-100">
                                MediStream
                            </span>
                            <span className="text-[11px] font-bold text-blue-300 tracking-[0.2em] uppercase mt-1">
                                {role || 'USER'} PORTAL
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto md:px-6">
                        <div className="flex items-center gap-2 min-w-max">
                            {navItems.map((item) => (
                                <NavLink
                                    key={`${item.to}-${item.label}`}
                                    to={item.to}
                                    className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive ? 'bg-white/20 text-white border border-white/25' : 'text-blue-100 hover:text-white hover:bg-white/10 border border-transparent'}`}
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>

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
                
                <Route path="/appointments" element={<ProtectedRoute allowedRoles={['ADMIN']}><Appointments /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR']}><Notifications /></ProtectedRoute>} />
                
                <Route path="/" element={<ProtectedRoute><RootRouter /></ProtectedRoute>} />

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

                <Route path="/doctor-dashboard" element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorDashboard /></ProtectedRoute>} />
                <Route path="/doctor-profile" element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorProfile /></ProtectedRoute>} />
\                <Route path="/doctor-availability" element={<ProtectedRoute allowedRoles={['DOCTOR']} requireVerified={true}><DoctorAvailability /></ProtectedRoute>} />
                <Route path="/doctor-appointments" element={<ProtectedRoute allowedRoles={['DOCTOR']} requireVerified={true}><DoctorAppointments /></ProtectedRoute>} />
                <Route path="/doctor-prescriptions" element={<ProtectedRoute allowedRoles={['DOCTOR']} requireVerified={true}><DoctorPrescriptions /></ProtectedRoute>} />

                <Route path="/patient-doctors" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDoctorSearch /></ProtectedRoute>} />

                <Route path="/patient-book-appointment" element={<ProtectedRoute allowedRoles={['PATIENT']}><Appointments /></ProtectedRoute>} />

                <Route path="/patient-appointments" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientAppointments /></ProtectedRoute>} />

                <Route path="/patient-prescriptions" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientPrescriptions /></ProtectedRoute>} />
                
                <Route path="/telemedicine" element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']} requireVerified={true}><Telemedicine /></ProtectedRoute>} />

                <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}