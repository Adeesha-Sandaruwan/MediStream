import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, createUser, updateUserRole, deleteUser, updateUserStatus } from '../api/adminApi';
import { getAllPatients } from '../api/patientApi';
import { Users, ShieldAlert, Loader2, UserPlus, Trash2, X, CheckCircle, Clock, AlertOctagon, Activity, FileText, Eye, Phone, User as UserIcon } from 'lucide-react';

const AdminDashboard = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [patientRecords, setPatientRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [showModal, setShowModal] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [selectedAudit, setSelectedAudit] = useState(null);
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
            setError('System Sync Error: Check if both Auth (8081) and Patient (8082) services are online.');
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
        try {
            await updateUserRole(token, id, newRole);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await updateUserStatus(token, id, newStatus);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Delete this account permanently?")) return;
        try {
            await deleteUser(token, id);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAuditUser = (email) => {
        const profile = patientRecords.find(p => p.email === email);
        if (profile) {
            setSelectedAudit(profile);
        } else {
            alert("No medical profile found for this user yet.");
        }
    };

    const getStatusIcon = (status) => {
        if (status === 'APPROVED') return <CheckCircle size={16} className="mr-1 text-green-600" />;
        if (status === 'PENDING') return <Clock size={16} className="mr-1 text-yellow-600" />;
        return <AlertOctagon size={16} className="mr-1 text-red-600" />;
    };

    const pendingCount = users.filter(u => u.verificationStatus === 'PENDING').length;

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
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-8">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
                    <div className="bg-blue-100 p-4 rounded-full mr-4"><Users className="text-blue-600" size={24} /></div>
                    <div><p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Total Users</p><p className="text-3xl font-bold">{users.length}</p></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
                    <div className="bg-yellow-100 p-4 rounded-full mr-4"><Activity className="text-yellow-600" size={24} /></div>
                    <div><p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Pending Review</p><p className="text-3xl font-bold">{pendingCount}</p></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
                    <div className="bg-purple-100 p-4 rounded-full mr-4"><FileText className="text-purple-600" size={24} /></div>
                    <div><p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Medical Records</p><p className="text-3xl font-bold">{patientRecords.length}</p></div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                            <tr>
                                <th className="p-4 font-semibold">Email Account</th>
                                <th className="p-4 font-semibold">Role</th>
                                <th className="p-4 font-semibold">Verification</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan="4" className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></td></tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-900">{user.email}</td>
                                    <td className="p-4">
                                        <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 outline-none">
                                            <option value="PATIENT">PATIENT</option><option value="DOCTOR">DOCTOR</option><option value="ADMIN">ADMIN</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center">
                                            {getStatusIcon(user.verificationStatus || 'PENDING')}
                                            <select value={user.verificationStatus || 'PENDING'} onChange={(e) => handleStatusChange(user.id, e.target.value)} className="text-xs font-bold bg-transparent outline-none cursor-pointer">
                                                <option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="SUSPENDED">SUSPENDED</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => handleAuditUser(user.email)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"><Eye size={18} /></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Create New Account</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input type="password" name="password" required value={formData.password} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="PATIENT">Patient</option><option value="DOCTOR">Doctor</option><option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isActionLoading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center">
                                    {isActionLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null} Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedAudit && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Clinical Audit Log</h3>
                            <button onClick={() => setSelectedAudit(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Full Legal Name</p>
                                    <p className="font-bold text-gray-900 text-lg">{selectedAudit.firstName} {selectedAudit.lastName}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">ID Reference</p>
                                    <p className="font-bold text-gray-900 text-lg">{selectedAudit.nationalId || 'Not Provided'}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start bg-red-50 p-4 rounded-xl border border-red-100">
                                    <Activity className="mr-3 text-red-500" size={24} />
                                    <div className="flex-1">
                                        <p className="font-bold text-red-900 uppercase text-xs">Medical Profile</p>
                                        <p className="text-sm text-red-800 font-medium">Chronic: {selectedAudit.chronicConditions || 'None'}</p>
                                        <p className="text-sm text-red-800 font-medium">Allergies: {selectedAudit.allergies || 'None'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start bg-green-50 p-4 rounded-xl border border-green-100">
                                    <Phone className="mr-3 text-green-500" size={24} />
                                    <div className="flex-1">
                                        <p className="font-bold text-green-900 uppercase text-xs">Emergency Contact</p>
                                        <p className="text-sm text-green-800 font-medium">{selectedAudit.emergencyContactName} ({selectedAudit.emergencyContactRelationship})</p>
                                        <p className="text-sm text-green-800 font-medium">{selectedAudit.emergencyContactPhone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end">
                            <button onClick={() => setSelectedAudit(null)} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-lg uppercase tracking-widest">Close Audit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;