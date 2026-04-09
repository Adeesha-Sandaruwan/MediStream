import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Auth from './pages/Auth';
import MedicalProfile from './pages/MedicalProfile';
import PatientDashboard from './pages/PatientDashboard';
import Telemedicine from './pages/Telemedicine';
import { useAuth } from './context/AuthContext';
import MedicalReports from './pages/MedicalReports';
import AdminDashboard from './pages/AdminDashboard';
import Appointments from './components/appointments';
import Notifications from './components/Notifications';


// ================= Doctor Dashboard =================
const DoctorDashboard = () => (
    <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-800">Doctor Dashboard</h1>
        <p className="mt-3 text-gray-600">
            Manage appointments and patient consultations.
        </p>

        <div className="mt-6 flex gap-4">
            <Link to="/appointments" className="bg-blue-600 text-white px-4 py-2 rounded">
                Appointments
            </Link>

            <Link to="/notifications" className="bg-green-600 text-white px-4 py-2 rounded">
                Notifications
            </Link>

            <Link to="/telemedicine" className="bg-indigo-600 text-white px-4 py-2 rounded">
                Telemedicine
            </Link>
        </div>
    </div>
);


// ================= Protected Route =================
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


// ================= Navbar =================
const Navbar = () => {
    const { logout, role } = useAuth();

    return (
        <nav className="bg-blue-800 text-white p-4 flex justify-between">
            <div className="font-bold">
                MediStream [{role}]
            </div>

            <div className="flex gap-4">
                <Link to="/appointments">Appointments</Link>
                <Link to="/notifications">Notifications</Link>
                <button onClick={logout} className="bg-red-500 px-3 py-1 rounded">
                    Logout
                </button>
            </div>
        </nav>
    );
};


// ================= Root Redirect =================
const RootRouter = () => {
    const { role } = useAuth();

    if (role === 'DOCTOR') return <Navigate to="/doctor-dashboard" replace />;
    if (role === 'ADMIN') return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/patient-dashboard" replace />;
};


// ================= MAIN APP =================
export default function App() {
    const { token } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            {token && <Navbar />}

            <Routes>

                {/* Auth */}
                <Route path="/auth" element={<Auth />} />

                {/* Root */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <RootRouter />
                        </ProtectedRoute>
                    }
                />

                {/* ================= PATIENT ================= */}
                <Route
                    path="/patient-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT']}>
                            <PatientDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT']}>
                            <MedicalProfile />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT']}>
                            <MedicalReports />
                        </ProtectedRoute>
                    }
                />

                {/* ================= DOCTOR ================= */}
                <Route
                    path="/doctor-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['DOCTOR']}>
                            <DoctorDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* ================= ADMIN ================= */}
                <Route
                    path="/admin-dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* ================= SHARED (PATIENT + DOCTOR) ================= */}

                <Route
                    path="/appointments"
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']}>
                            <Appointments />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/notifications"
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']}>
                            <Notifications />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/telemedicine"
                    element={
                        <ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']}>
                            <Telemedicine />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </div>
    );
}