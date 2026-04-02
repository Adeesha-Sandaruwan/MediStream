import { useMemo, useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { getEmailFromJwt } from '../utils/jwt';

export const AuthProvider = ({ children }) => {
    // 1. We now grab BOTH the token and the role from localStorage
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [role, setRole] = useState(localStorage.getItem('role') || null);

    const email = useMemo(() => getEmailFromJwt(token), [token]);

    // Helper function to keep our code clean and prevent repeating ourselves
    const saveAuthData = (data) => {
        setToken(data.token);
        setRole(data.role);
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
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
        localStorage.removeItem('token');
        localStorage.removeItem('role');
    };

    return (
        // 2. We expose the 'role' to the rest of the app here
        <AuthContext.Provider value={{ token, role, email, login, register, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};