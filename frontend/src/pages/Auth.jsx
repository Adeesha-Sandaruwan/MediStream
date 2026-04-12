import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Activity, Mail, Lock, User as UserIcon } from 'lucide-react';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('PATIENT');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login, register, googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password, role);
            }
            navigate('/');
        } catch (error) {
            console.error(error);
            setError(error.response?.data?.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await googleLogin(credentialResponse.credential);
            navigate('/');
        } catch (error) {
            console.error(error);
            setError('Google authentication failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
            <div className="max-w-md w-full relative">
                
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>

                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 transition-all duration-500 relative z-10">
                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="h-16 w-16 bg-linear-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform transition-transform duration-500 hover:rotate-12 hover:scale-110">
                            <Activity className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-center text-3xl font-extrabold text-gray-900 transition-all duration-300">
                            {isLogin ? 'Welcome Back' : 'Join MediStream'}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {isLogin ? 'Enter your details to access your account' : 'Start your telemedicine journey today'}
                        </p>
                    </div>
                    
                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-bounce">
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="email"
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-300"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-300"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div 
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${isLogin ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}
                        >
                            <div className="relative group mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-300 appearance-none"
                                >
                                    <option value="PATIENT">I am a Patient</option>
                                    <option value="DOCTOR">I am a Doctor</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-white font-semibold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between">
                        <span className="w-1/5 border-b border-gray-200 lg:w-1/4"></span>
                        <span className="text-xs text-center text-gray-500 uppercase font-semibold">Or continue with</span>
                        <span className="w-1/5 border-b border-gray-200 lg:w-1/4"></span>
                    </div>

                    <div className="mt-6 flex justify-center transform transition-all duration-300 hover:scale-[1.02]">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google authentication failed')}
                            useOneTap
                            theme="outline"
                            size="large"
                            shape="pill"
                            width="100%"
                        />
                    </div>

                    <p className="mt-8 text-center text-sm text-gray-600">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button 
                            onClick={() => setIsLogin(!isLogin)}
                            className="font-bold text-blue-600 hover:text-indigo-600 transition-colors focus:outline-none hover:underline"
                        >
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}