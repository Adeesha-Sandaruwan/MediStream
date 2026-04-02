import { useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
    // 1. Grab token, role, AND verificationStatus from localStorage
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [role, setRole] = useState(localStorage.getItem('role') || null);
    const [verificationStatus, setVerificationStatus] = useState(localStorage.getItem('verificationStatus') || null);

    // Helper function to keep our code clean and prevent repeating ourselves
    const saveAuthData = (data) => {
        setToken(data.token);
        setRole(data.role);
        setVerificationStatus(data.verificationStatus); // Save to state
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('verificationStatus', data.verificationStatus); // Save to browser
    };

    const login = async (email, password) => {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/authenticate`, { email, password });
        saveAuthData(response.data);
        return response.data;
    };

    const register = async (email, password, role) => {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, { email, password, role });
        saveAuthData(response.data);
        return response.data;
    };

    const googleLogin = async (googleToken) => {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/google`, { token: googleToken });
        saveAuthData(response.data);
        return response.data;
    };

    const logout = () => {
        setToken(null);
        setRole(null);
        setVerificationStatus(null); // Clear state
        
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('verificationStatus'); // Clear from browser
    };

    return (
        // 2. We expose 'verificationStatus' to the rest of the app here
        <AuthContext.Provider value={{ token, role, verificationStatus, login, register, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};