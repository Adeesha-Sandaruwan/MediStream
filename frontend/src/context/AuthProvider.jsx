import { useState } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token') || null);

    const login = async (email, password) => {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/authenticate`, { email, password });
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        return response.data;
    };

    const register = async (email, password, role) => {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, { email, password, role });
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        return response.data;
    };

    const googleLogin = async (googleToken) => {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/google`, { token: googleToken });
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        return response.data;
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ token, login, register, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};