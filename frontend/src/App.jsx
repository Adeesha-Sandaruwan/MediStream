import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Auth from './pages/Auth';
import MedicalProfile from './pages/MedicalProfile';
import PatientDashboard from './pages/PatientDashboard'; // <-- IMPORTED HERE
import Telemedicine from './pages/Telemedicine';
import PatientDashboard from './pages/PatientDashboard';
import { useAuth } from './context/AuthContext';
import MedicalReports from './pages/MedicalReports';

// Stub for Teammate
const DoctorDashboard = () => (
    <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-800">Doctor Dashboard (Under Construction)</h1>
        <p className="mt-3 text-gray-600">
            Use Telemedicine to start or join patient video consultations.
        </p>
        <div className="mt-6">
            <Link
                to="/telemedicine"
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
                Open Telemedicine
            </Link>
        </div>
    </div>
);

// Stub for Admin
const AdminDashboard = () => (
    <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard (Under Construction)</h1>
    </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { token, role } = useAuth();
    if (!token) {
        return <Navigate to="/auth" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
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

                {/* CLEAN ROUTE TO YOUR NEW SEPARATE FILE */}
                <Route 
                    path="/patient-dashboard" 
                    element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} 
                />
                
                <Route 
                    path="/profile" 
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT']}>
                            <div className="py-6">
                                <div className="max-w-7xl mx-auto px-4 mb-6">
                                    <Link to="/patient-dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                                        &larr; Back to Dashboard
                                    </Link>
                                </div>
                                <MedicalProfile />
                            </div>
                        </ProtectedRoute>
                    } 
                />

                <Route 
                    path="/reports" 
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT']}>
                            <div className="py-6">
                                <div className="max-w-7xl mx-auto px-4 mb-6">
                                    <Link to="/patient-dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                                        &larr; Back to Dashboard
                                    </Link>
                                </div>
                                <MedicalReports />
                            </div>
                        </ProtectedRoute>
                    } 
                />

                <Route 
                    path="/doctor-dashboard" 
                    element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorDashboard /></ProtectedRoute>} 
                />

                <Route
                    path="/telemedicine"
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']}>
                            <Telemedicine />
                        </ProtectedRoute>
                    }
                />

                <Route 
                    path="/admin-dashboard" 
                    element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} 
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}