import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { token } = useAuth();
    if (!token) {
        return <Navigate to="/auth" replace />;
    }
    return children;
};

export default function App() {
    return (
        <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
                path="/" 
                element={
                    <ProtectedRoute>
                        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to MediStream</h1>
                            <p className="text-gray-600">You have successfully authenticated with the Spring Boot Microservice!</p>
                        </div>
                    </ProtectedRoute>
                } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}