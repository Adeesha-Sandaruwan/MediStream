import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, createUser, updateUserRole, deleteUser, updateUserStatus } from '../api/adminApi';
import { getAllPatients } from '../api/patientApi';
import { Users, ShieldAlert, Loader2, UserPlus, Trash2, X, CheckCircle, Clock, AlertOctagon, Activity, FileText } from 'lucide-react';

const AdminDashboard = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [patientRecords, setPatientRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [showModal, setShowModal] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'PATIENT'
    });

    useEffect(() => {
        fetchDashboardData();
    }, [token]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [usersData, patientsData] = await Promise.all([
                getAllUsers(token),
                getAllPatients(token).catch(() => []) 
            ]);
            setUsers(usersData);
            setPatientRecords(patientsData);
        } catch (err) {
            console.error(err);
            setError('Failed to load system data. Ensure both Auth and Patient backends are running.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        setError('');
        try {
            await createUser(token, formData);
            setShowModal(false);
            setFormData({ email: '', password: '', role: 'PATIENT' });
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            setError('Failed to create user. Email might already exist.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRoleChange = async (id, newRole) => {
        setError('');
        try {
            await updateUserRole(token, id, newRole);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            setError('Failed to update user role.');
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        setError('');
        try {
            await updateUserStatus(token, id, newStatus);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            setError('Failed to update user status.');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you absolutely sure you want to delete this user? This cannot be undone.")) return;
        setError('');
        try {
            await deleteUser(token, id);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            setError('Failed to delete user.');
        }
    };

    const getStatusIcon = (status) => {
        if (status === 'APPROVED') return <CheckCircle size={16} className="mr-1 text-green-600" />;
        if (status === 'PENDING') return <Clock size={16} className="mr-1 text-yellow-600" />;
        return <AlertOctagon size={16} className="mr-1 text-red-600" />;
    };

    const pendingDoctorsCount = users.filter(u => u.role === 'DOCTOR' && u.verificationStatus === 'PENDING').length;
    const totalPatientsCount = users.filter(u => u.role === 'PATIENT').length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <ShieldAlert className="mr-3 text-indigo-600" size={32} />
                    Platform Administration
                </h1>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    <UserPlus size={20} className="mr-2" />
                    Add New User
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg mb-6 font-medium">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
                    <div className="bg-blue-100 p-4 rounded-full mr-4">
                        <Users className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
                    <div className={`p-4 rounded-full mr-4 ${pendingDoctorsCount > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <Activity className={`${pendingDoctorsCount > 0 ? 'text-yellow-600' : 'text-green-600'}`} size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Doctors</p>
                        <p className="text-3xl font-bold text-gray-900">{pendingDoctorsCount}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
                    <div className="bg-purple-100 p-4 rounded-full mr-4">
                        <FileText className="text-purple-600" size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Medical Profiles</p>
                        <p className="text-3xl font-bold text-gray-900">{patientRecords.length} <span className="text-sm font-normal text-gray-400">/ {totalPatientsCount}</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
                    <Users className="text-gray-500 mr-2" size={20} />
                    <h2 className="text-lg font-semibold text-gray-800">User Directory</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4 font-semibold">ID</th>
                                <th className="p-4 font-semibold">Email</th>
                                <th className="p-4 font-semibold">Role</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading system data...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500 italic">
                                        No users found in the system.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-600">#{user.id}</td>
                                        <td className="p-4 font-medium text-gray-900">{user.email}</td>
                                        <td className="p-4">
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 focus:ring-purple-500' : 
                                                    user.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700 focus:ring-blue-500' : 
                                                    'bg-gray-100 text-gray-700 focus:ring-gray-500'
                                                }`}
                                            >
                                                <option value="PATIENT" className="text-gray-900 bg-white">PATIENT</option>
                                                <option value="DOCTOR" className="text-gray-900 bg-white">DOCTOR</option>
                                                <option value="ADMIN" className="text-gray-900 bg-white">ADMIN</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center">
                                                {getStatusIcon(user.verificationStatus || 'PENDING')}
                                                <select 
                                                    value={user.verificationStatus || 'PENDING'} 
                                                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                                                    className={`px-2 py-1 rounded-md text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 bg-transparent ${
                                                        (user.verificationStatus || 'PENDING') === 'APPROVED' ? 'text-green-700 focus:ring-green-500' : 
                                                        (user.verificationStatus || 'PENDING') === 'PENDING' ? 'text-yellow-700 focus:ring-yellow-500' : 
                                                        'text-red-700 focus:ring-red-500'
                                                    }`}
                                                >
                                                    <option value="PENDING" className="text-gray-900 bg-white">PENDING</option>
                                                    <option value="APPROVED" className="text-gray-900 bg-white">APPROVED</option>
                                                    <option value="REJECTED" className="text-gray-900 bg-white">REJECTED</option>
                                                    <option value="SUSPENDED" className="text-gray-900 bg-white">SUSPENDED</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors inline-flex items-center justify-center"
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Create New User</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                                <input 
                                    type="password" 
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
                                <select 
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                >
                                    <option value="PATIENT">Patient</option>
                                    <option value="DOCTOR">Doctor</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 flex items-center"
                                >
                                    {isActionLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                                    {isActionLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;