import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, createUser, deleteUser, updateUserStatus } from '../api/adminApi';
import { getAllPatients } from '../api/patientApi';
import { Users, ShieldAlert, Loader2, UserPlus, Trash2, X, CheckCircle, Clock, AlertOctagon, Activity, FileText, Eye, Phone, MapPin, Award, Building, BarChart3, PieChart, BellRing, AlertTriangle, Info, DollarSign } from 'lucide-react';
import AdminTransactionMonitor from '../components/AdminTransactionMonitor';

const AdminDashboard = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [patientRecords, setPatientRecords] = useState([]);
    const [doctorRecords, setDoctorRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('users');
    
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
        const fetchDoctors = fetch('http://localhost:8084/api/doctors/all', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(res => res.ok ? res.json() : []);

        const [usersResult, patientsResult, doctorsResult] = await Promise.allSettled([
            getAllUsers(token),
            getAllPatients(token),
            fetchDoctors
        ]);

        if (usersResult.status === 'fulfilled') {
            setUsers(usersResult.value);
        }

        if (patientsResult.status === 'fulfilled') {
            setPatientRecords(patientsResult.value);
        } else {
            setPatientRecords([]);
        }

        if (doctorsResult.status === 'fulfilled') {
            setDoctorRecords(doctorsResult.value);
        } else {
            setDoctorRecords([]);
        }

        const syncIssues = [];
        if (usersResult.status === 'rejected') {
            console.error(usersResult.reason);
            syncIssues.push('User directory is temporarily unavailable');
        }
        if (patientsResult.status === 'rejected') {
            // Patient API can reject admin token depending on service policy; keep dashboard usable.
            console.warn('Patient records unavailable for admin dashboard sync:', patientsResult.reason);
        }
        if (doctorsResult.status === 'rejected') {
            console.error(doctorsResult.reason);
            syncIssues.push('Doctor records unavailable');
        }

        if (syncIssues.length > 0) {
            setError(syncIssues.join('. ') + '.');
        }

        if (usersResult.status === 'rejected') {
            setUsers([]);
        }

        setIsLoading(false);
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

    const handleAuditUser = (email, role) => {
        if (role === 'DOCTOR') {
            const profile = doctorRecords.find(p => p.email === email);
            if (profile) {
                setSelectedAudit({ type: 'DOCTOR', data: profile });
            } else {
                alert("No professional profile found for this doctor yet.");
            }
        } else if (role === 'PATIENT') {
            const profile = patientRecords.find(p => p.email === email);
            if (profile) {
                setSelectedAudit({ type: 'PATIENT', data: profile });
            } else {
                alert("No medical profile found for this patient yet.");
            }
        } else {
            alert("Admins do not have clinical profiles to audit.");
        }
    };

    const getStatusIcon = (status) => {
        if (status === 'APPROVED') return <CheckCircle size={16} className="mr-1 text-emerald-500" />;
        if (status === 'PENDING') return <Clock size={16} className="mr-1 text-amber-500" />;
        return <AlertOctagon size={16} className="mr-1 text-rose-500" />;
    };

    const pendingCount = users.filter(u => u.role === 'DOCTOR' && u.verificationStatus === 'PENDING').length;

    const roleStats = useMemo(() => {
        return users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, { PATIENT: 0, DOCTOR: 0, ADMIN: 0 });
    }, [users]);

    const topSpecialties = useMemo(() => {
        const stats = doctorRecords.reduce((acc, doc) => {
            const spec = doc.specialty || 'Unspecified';
            acc[spec] = (acc[spec] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 4);
    }, [doctorRecords]);

    const patientDoctorRatio = useMemo(() => {
        if (roleStats.DOCTOR === 0) return roleStats.PATIENT;
        return (roleStats.PATIENT / roleStats.DOCTOR).toFixed(1);
    }, [roleStats]);

    const systemAlerts = useMemo(() => {
        const alerts = [];
        
        const pendingDoctors = users.filter(u => u.role === 'DOCTOR' && u.verificationStatus === 'PENDING');
        if (pendingDoctors.length > 0) {
            alerts.push({
                id: 'pending',
                type: 'WARNING',
                icon: <AlertTriangle size={20} className="text-amber-500 animate-pulse" />,
                bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
                border: 'border-amber-200',
                title: 'Pending Verifications',
                message: `${pendingDoctors.length} doctor account(s) await credential review.`
            });
        }

        const suspendedUsers = users.filter(u => u.verificationStatus === 'SUSPENDED');
        if (suspendedUsers.length > 0) {
            alerts.push({
                id: 'suspended',
                type: 'CRITICAL',
                icon: <ShieldAlert size={20} className="text-rose-500" />,
                bg: 'bg-gradient-to-r from-rose-50 to-red-50',
                border: 'border-rose-200',
                title: 'Suspended Accounts',
                message: `${suspendedUsers.length} account(s) are currently locked out of the platform.`
            });
        }

        const patientEmails = new Set(patientRecords.map(p => p.email));
        const incompletePatients = users.filter(u => u.role === 'PATIENT' && !patientEmails.has(u.email));
        if (incompletePatients.length > 0) {
            alerts.push({
                id: 'incomplete',
                type: 'INFO',
                icon: <Info size={20} className="text-sky-500" />,
                bg: 'bg-gradient-to-r from-sky-50 to-blue-50',
                border: 'border-sky-200',
                title: 'Incomplete Profiles',
                message: `${incompletePatients.length} patient(s) registered but have not setup medical profiles.`
            });
        }

        if (alerts.length === 0) {
            alerts.push({
                id: 'clear',
                type: 'SUCCESS',
                icon: <CheckCircle size={20} className="text-emerald-500" />,
                bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
                border: 'border-emerald-200',
                title: 'System Clear',
                message: 'No pending security operations or alerts at this time.'
            });
        }

        return alerts;
    }, [users, patientRecords]);

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 relative min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-8 sm:mb-10">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 to-blue-700 flex items-center">
                    <ShieldAlert className="mr-3 text-indigo-600 shrink-0" size={36} />
                    Platform Admin
                </h1>
                <button 
                    onClick={() => setShowModal(true)}
                    disabled={activeTab !== 'users'}
                    className={`flex items-center justify-center w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 ${activeTab !== 'users' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <UserPlus size={20} className="mr-2" />
                    New User
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-1 grid grid-cols-1 sm:grid-cols-2 gap-1 mb-6 sm:mb-8">
                {[
                    { id: 'users', label: 'User Management', icon: Users },
                    { id: 'transactions', label: 'Payment Transactions', icon: DollarSign },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* User Management Tab Content */}
            {activeTab === 'users' && (
                <>
                    {error && (
                        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl mb-8 shadow-sm">
                            <div className="flex items-center">
                                <AlertOctagon className="mr-3 shrink-0" size={20} />
                                <p className="font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 p-6 sm:p-8 flex items-center transition-all duration-300 hover:-translate-y-1 group">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-2xl mr-5 group-hover:scale-110 transition-transform duration-300">
                        <Users className="text-blue-600" size={28} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Users</p>
                        <p className="text-4xl font-black text-gray-800">{users.length}</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 p-6 sm:p-8 flex items-center transition-all duration-300 hover:-translate-y-1 group">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-4 rounded-2xl mr-5 group-hover:scale-110 transition-transform duration-300">
                        <Activity className="text-amber-600" size={28} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Review</p>
                        <p className="text-4xl font-black text-gray-800">{pendingCount}</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 p-6 sm:p-8 flex items-center transition-all duration-300 hover:-translate-y-1 group sm:col-span-2 lg:col-span-1">
                    <div className="bg-gradient-to-br from-purple-50 to-fuchsia-100 p-4 rounded-2xl mr-5 group-hover:scale-110 transition-transform duration-300">
                        <FileText className="text-purple-600" size={28} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Records</p>
                        <p className="text-4xl font-black text-gray-800">{patientRecords.length + doctorRecords.length}</p>
                    </div>
                </div>
            </div>

            {!isLoading && users.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 lg:col-span-1 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-8">
                            <PieChart className="text-indigo-500 mr-3" size={26} />
                            <h2 className="text-xl font-extrabold text-gray-900">Demographics</h2>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                                    <span>Patients</span>
                                    <span className="text-emerald-600">{roleStats.PATIENT} ({Math.round((roleStats.PATIENT / users.length) * 100) || 0}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(roleStats.PATIENT / users.length) * 100}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                                    <span>Doctors</span>
                                    <span className="text-blue-600">{roleStats.DOCTOR} ({Math.round((roleStats.DOCTOR / users.length) * 100) || 0}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(roleStats.DOCTOR / users.length) * 100}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                                    <span>Admins</span>
                                    <span className="text-purple-600">{roleStats.ADMIN} ({Math.round((roleStats.ADMIN / users.length) * 100) || 0}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-400 to-fuchsia-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(roleStats.ADMIN / users.length) * 100}%` }}></div>
                                </div>
                            </div>
                            <div className="pt-6 mt-4 border-t border-gray-100">
                                <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-sm font-bold text-indigo-900">Network Ratio</span>
                                    <span className="font-black text-indigo-700 bg-white px-3 py-1 rounded-lg shadow-sm">{patientDoctorRatio} : 1</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 lg:col-span-1 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-8">
                            <BarChart3 className="text-indigo-500 mr-3" size={26} />
                            <h2 className="text-xl font-extrabold text-gray-900">Top Specialties</h2>
                        </div>
                        {topSpecialties.length > 0 ? (
                            <div className="space-y-4">
                                {topSpecialties.map(([specialty, count], index) => (
                                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 flex items-center justify-center font-black mr-4 shadow-sm border border-indigo-100/50">
                                                {index + 1}
                                            </div>
                                            <span className="font-bold text-gray-800 truncate max-w-[140px] sm:max-w-[180px]">{specialty}</span>
                                        </div>
                                        <span className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-black tracking-wide">{count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                <Activity size={40} className="mb-4 opacity-30" />
                                <p className="text-sm font-bold">No specialties verified yet.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 lg:col-span-1 flex flex-col hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-8">
                            <BellRing className="text-indigo-500 mr-3" size={26} />
                            <h2 className="text-xl font-extrabold text-gray-900">System Alerts</h2>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {systemAlerts.map(alert => (
                                <div key={alert.id} className={`p-5 rounded-2xl border ${alert.bg} ${alert.border} shadow-sm transition-all hover:shadow-md`}>
                                    <div className="flex items-start">
                                        <div className="shrink-0 mt-0.5 bg-white p-2 rounded-xl shadow-sm">{alert.icon}</div>
                                        <div className="ml-4">
                                            <h3 className="text-sm font-black text-gray-900 tracking-tight">{alert.title}</h3>
                                            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{alert.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-extrabold text-gray-900">User Directory</h2>
                </div>
                <div className="md:hidden p-4 space-y-3">
                    {isLoading ? (
                        <div className="p-10 text-center text-indigo-400"><Loader2 className="animate-spin mx-auto" size={32} /></div>
                    ) : users.map((user) => (
                        <div key={user.id} className="rounded-2xl border border-gray-200 p-4 bg-white shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-gray-900 break-all">{user.email}</p>
                                    <p className="text-xs text-gray-500 mt-1">ID: {user.id}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-[11px] font-black tracking-wide border ${
                                    user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                    user.role === 'DOCTOR' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                    {user.role}
                                </span>
                            </div>

                            <div className="mt-3">
                                {user.role === 'DOCTOR' ? (
                                    <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                        {getStatusIcon(user.verificationStatus || 'PENDING')}
                                        <select
                                            value={user.verificationStatus || 'PENDING'}
                                            onChange={(e) => handleStatusChange(user.id, e.target.value)}
                                            className="text-xs font-bold bg-transparent outline-none cursor-pointer text-gray-700 ml-1 w-full"
                                        >
                                            <option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="SUSPENDED">SUSPENDED</option>
                                        </select>
                                    </div>
                                ) : (
                                    <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                        <CheckCircle size={16} className="mr-2 text-emerald-500" /> ACTIVE
                                    </span>
                                )}
                            </div>

                            <div className="mt-3 flex items-center justify-end space-x-2">
                                <button
                                    onClick={() => handleAuditUser(user.email, user.role)}
                                    className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all active:scale-95"
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-2.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all active:scale-95"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-gray-50/80 text-gray-500 text-xs font-black uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="p-5">Account Details</th>
                                <th className="p-5">System Role</th>
                                <th className="p-5">Status</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan="4" className="p-16 text-center text-indigo-400"><Loader2 className="animate-spin mx-auto" size={32} /></td></tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors duration-200 group">
                                    <td className="p-5">
                                        <div className="font-bold text-gray-900">{user.email}</div>
                                        <div className="text-xs text-gray-400 font-medium mt-1">ID: {user.id}</div>
                                    </td>
                                    
                                    <td className="p-5">
                                        <span className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-wide shadow-sm border ${
                                            user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                            user.role === 'DOCTOR' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                            'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>

                                    <td className="p-5">
                                        <div className="flex items-center">
                                            {user.role === 'DOCTOR' ? (
                                                <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                                                    {getStatusIcon(user.verificationStatus || 'PENDING')}
                                                    <select 
                                                        value={user.verificationStatus || 'PENDING'} 
                                                        onChange={(e) => handleStatusChange(user.id, e.target.value)} 
                                                        className="text-xs font-bold bg-transparent outline-none cursor-pointer text-gray-700 ml-1"
                                                    >
                                                        <option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="SUSPENDED">SUSPENDED</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <span className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                    <CheckCircle size={16} className="mr-2 text-emerald-500" /> ACTIVE
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button 
                                                onClick={() => handleAuditUser(user.email, user.role)} 
                                                className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all hover:scale-110 active:scale-95"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.id)} 
                                                className="p-2.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all hover:scale-110 active:scale-95"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
                </>
            )}

            {/* Payment Transactions Tab Content */}
            {activeTab === 'transactions' && (
                <AdminTransactionMonitor />
            )}

            {activeTab === 'users' && showModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-xl font-extrabold text-gray-900">Create Account</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium" placeholder="user@medistream.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Temporary Password</label>
                                <input type="password" name="password" required value={formData.password} onChange={handleInputChange} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">System Role</label>
                                <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700 cursor-pointer">
                                    <option value="PATIENT">Patient</option><option value="DOCTOR">Doctor</option><option value="ADMIN">Administrator</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors active:scale-95">Cancel</button>
                                <button type="submit" disabled={isActionLoading} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center active:scale-95">
                                    {isActionLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null} Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'users' && selectedAudit && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all border border-gray-100">
                        <div className="px-8 py-6 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center">
                                {selectedAudit.type === 'DOCTOR' ? <Award className="mr-3 text-indigo-600" size={24} /> : <Activity className="mr-3 text-emerald-600" size={24} />}
                                {selectedAudit.type === 'DOCTOR' ? 'Doctor Credential Audit' : 'Clinical Profile Audit'}
                            </h3>
                            <button onClick={() => setSelectedAudit(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1 space-y-8 bg-white custom-scrollbar">
                            {selectedAudit.type === 'PATIENT' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                                            <p className="text-xs font-black text-gray-400 mb-1.5 uppercase tracking-widest">Full Legal Name</p>
                                            <p className="font-extrabold text-gray-900 text-lg">{selectedAudit.data.firstName || '-'} {selectedAudit.data.lastName || '-'}</p>
                                        </div>
                                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                                            <p className="text-xs font-black text-gray-400 mb-1.5 uppercase tracking-widest">ID Reference</p>
                                            <p className="font-extrabold text-gray-900 text-lg">{selectedAudit.data.nationalId || 'Not Provided'}</p>
                                        </div>
                                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                                            <p className="text-xs font-black text-gray-400 mb-1.5 uppercase tracking-widest">Date of Birth</p>
                                            <p className="font-extrabold text-gray-900 text-lg">{selectedAudit.data.dateOfBirth || 'Not Provided'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="bg-white p-3 rounded-xl shadow-sm mr-5"><MapPin className="text-indigo-500" size={24} /></div>
                                        <div className="flex-1 mt-1">
                                            <p className="font-black text-gray-900 uppercase text-xs tracking-widest mb-2">Residence Address</p>
                                            <p className="text-base font-medium text-gray-700">{selectedAudit.data.address || 'No address provided.'}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start bg-gradient-to-br from-rose-50 to-red-50 p-6 rounded-2xl border border-rose-100 hover:shadow-md transition-shadow">
                                        <div className="bg-white p-3 rounded-xl shadow-sm mr-5 mb-4 sm:mb-0"><Activity className="text-rose-500" size={24} /></div>
                                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-5 mt-1">
                                            <div className="md:col-span-2">
                                                <p className="font-black text-rose-900 uppercase text-xs tracking-widest border-b border-rose-200/50 pb-3 mb-1">Primary Medical Profile</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-rose-700 mb-2 tracking-wide">CHRONIC CONDITIONS</p>
                                                <p className="text-sm font-bold text-rose-900 bg-white/60 p-3 rounded-xl border border-rose-100/50">{selectedAudit.data.chronicConditions || 'None reported'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-rose-700 mb-2 tracking-wide">KNOWN ALLERGIES</p>
                                                <p className="text-sm font-bold text-rose-900 bg-white/60 p-3 rounded-xl border border-rose-100/50">{selectedAudit.data.allergies || 'None reported'}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="text-xs font-black text-rose-700 mb-2 tracking-wide">CURRENT MEDICATIONS</p>
                                                <p className="text-sm font-bold text-rose-900 bg-white/60 p-3 rounded-xl border border-rose-100/50">{selectedAudit.data.currentMedications || 'None reported'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100 hover:shadow-md transition-shadow">
                                        <div className="bg-white p-3 rounded-xl shadow-sm mr-5"><Phone className="text-emerald-500" size={24} /></div>
                                        <div className="flex-1 mt-1">
                                            <p className="font-black text-emerald-900 uppercase text-xs tracking-widest border-b border-emerald-200/50 pb-3 mb-3">Emergency Contact</p>
                                            <p className="text-lg text-emerald-950 font-extrabold">{selectedAudit.data.emergencyContactName || '-'} <span className="font-medium text-emerald-700 text-sm ml-2 px-3 py-1 bg-emerald-100/50 rounded-lg">{selectedAudit.data.emergencyContactRelationship || '-'}</span></p>
                                            <p className="text-base text-emerald-800 font-bold mt-2">{selectedAudit.data.emergencyContactPhone || 'No phone provided'}</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedAudit.type === 'DOCTOR' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                                            <p className="text-xs font-black text-gray-400 mb-1.5 uppercase tracking-widest">Full Name</p>
                                            <p className="font-extrabold text-gray-900 text-xl">Dr. {selectedAudit.data.firstName || '-'} {selectedAudit.data.lastName || '-'}</p>
                                        </div>
                                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                                            <p className="text-xs font-black text-gray-400 mb-1.5 uppercase tracking-widest">Contact Number</p>
                                            <p className="font-extrabold text-gray-900 text-xl">{selectedAudit.data.phoneNumber || 'Not Provided'}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 hover:shadow-md transition-shadow">
                                        <div className="bg-white p-3 rounded-xl shadow-sm mr-5 mb-4 sm:mb-0"><Award className="text-blue-500" size={24} /></div>
                                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-5 mt-1">
                                            <div className="md:col-span-2">
                                                <p className="font-black text-blue-900 uppercase text-xs tracking-widest border-b border-blue-200/50 pb-3 mb-1">Professional Credentials</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-blue-700 mb-2 tracking-wide">SPECIALTY</p>
                                                <p className="text-sm font-bold text-blue-900 bg-white/60 p-3 rounded-xl border border-blue-100/50">{selectedAudit.data.specialty || 'Not specified'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-blue-700 mb-2 tracking-wide">LICENSE NUMBER</p>
                                                <p className="text-sm font-mono font-bold text-blue-900 bg-white/60 p-3 rounded-xl border border-blue-100/50 tracking-wider">{selectedAudit.data.licenseNumber || 'Pending verification'}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="text-xs font-black text-blue-700 mb-2 tracking-wide">QUALIFICATIONS</p>
                                                <p className="text-sm font-bold text-blue-900 bg-white/60 p-3 rounded-xl border border-blue-100/50">{selectedAudit.data.qualifications || 'Not specified'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start bg-gradient-to-br from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100 hover:shadow-md transition-shadow">
                                        <div className="bg-white p-3 rounded-xl shadow-sm mr-5 mb-4 sm:mb-0"><Building className="text-indigo-500" size={24} /></div>
                                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-5 mt-1">
                                            <div className="md:col-span-2">
                                                <p className="font-black text-indigo-900 uppercase text-xs tracking-widest border-b border-indigo-200/50 pb-3 mb-1">Practice & Affiliations</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-indigo-700 mb-2 tracking-wide">HOSPITAL AFFILIATION</p>
                                                <p className="text-sm font-bold text-indigo-900 bg-white/60 p-3 rounded-xl border border-indigo-100/50">{selectedAudit.data.hospitalAffiliation || 'Independent Practice'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-indigo-700 mb-2 tracking-wide">YEARS OF EXPERIENCE</p>
                                                <p className="text-sm font-bold text-indigo-900 bg-white/60 p-3 rounded-xl border border-indigo-100/50">{selectedAudit.data.experienceYears ? `${selectedAudit.data.experienceYears} Years Clinical` : 'Not specified'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="bg-white p-3 rounded-xl shadow-sm mr-5"><FileText className="text-gray-500" size={24} /></div>
                                        <div className="flex-1 mt-1">
                                            <p className="font-black text-gray-900 uppercase text-xs tracking-widest mb-3">Professional Biography</p>
                                            <p className="text-sm text-gray-700 leading-relaxed bg-white p-5 rounded-xl border border-gray-200 font-medium">{selectedAudit.data.bio || 'No biography provided by the doctor.'}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex justify-end shrink-0">
                            <button onClick={() => setSelectedAudit(null)} className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95 uppercase tracking-widest text-sm">
                                Close Audit View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;