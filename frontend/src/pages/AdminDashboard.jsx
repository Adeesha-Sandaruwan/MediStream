import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers } from '../api/adminApi';
import { Users, ShieldAlert, Loader2 } from 'lucide-react';

const AdminDashboard = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await getAllUsers(token);
            setUsers(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load users. Ensure Auth backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <ShieldAlert className="mr-3 text-red-600" size={32} />
                    System Administration
                </h1>
                {/* We will add the "Add User" button here in the next commit */}
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 font-medium">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
                    <Users className="text-gray-500 mr-2" size={20} />
                    <h2 className="text-lg font-semibold text-gray-800">User Directory</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4 font-semibold">ID</th>
                                <th className="p-4 font-semibold">Email</th>
                                <th className="p-4 font-semibold">Role</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading system users...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-500 italic">
                                        No users found in the system.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-600">#{user.id}</td>
                                        <td className="p-4 font-medium text-gray-900">{user.email}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                                                user.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 
                                                user.role === 'DOCTOR' ? 'bg-green-100 text-green-700' : 
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {/* Action buttons going here in Commit 4 & 5 */}
                                            <span className="text-gray-400 text-sm italic">Actions pending...</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;