import { useMemo, useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { getEmailFromJwt } from '../utils/jwt';

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [role, setRole] = useState(localStorage.getItem('role') || null);
    const [verificationStatus, setVerificationStatus] = useState(localStorage.getItem('verificationStatus') || null);

    const email = useMemo(() => getEmailFromJwt(token), [token]);

    const saveAuthData = (data) => {
        setToken(data.token);
        setRole(data.role);
        setVerificationStatus(data.verificationStatus);
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('verificationStatus', data.verificationStatus);
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
        setVerificationStatus(null);
        
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('verificationStatus');
    };

    return (
        <AuthContext.Provider value={{ token, role, verificationStatus, email, login, register, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};