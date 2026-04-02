import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, createUser, deleteUser, updateUserStatus } from '../api/adminApi';
import { getAllPatients } from '../api/patientApi';
import { Users, ShieldAlert, Loader2, UserPlus, Trash2, X, CheckCircle, Clock, AlertOctagon, Activity, FileText, Eye, Phone, MapPin, Award, Building } from 'lucide-react';

const AdminDashboard = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [patientRecords, setPatientRecords] = useState([]);
    const [doctorRecords, setDoctorRecords] = useState([]);
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
            const fetchDoctors = fetch('http://localhost:8084/api/doctors/all', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).then(res => res.ok ? res.json() : []).catch(() => []);

            const [usersData, patientsData, doctorsData] = await Promise.all([
                getAllUsers(token),
                getAllPatients(token).catch(() => []),
                fetchDoctors
            ]);

            setUsers(usersData);
            setPatientRecords(patientsData);
            setDoctorRecords(doctorsData);
        } catch (err) {
            console.error(err);
            setError('System Sync Error: Check if Auth, Patient, and Doctor services are online.');
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
        if (status === 'APPROVED') return <CheckCircle size={16} className="mr-1 text-green-600" />;
        if (status === 'PENDING') return <Clock size={16} className="mr-1 text-yellow-600" />;
        return <AlertOctagon size={16} className="mr-1 text-red-600" />;
    };

    const pendingCount = users.filter(u => u.role === 'DOCTOR' && u.verificationStatus === 'PENDING').length;

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
                    <div><p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Doctors Pending</p><p className="text-3xl font-bold">{pendingCount}</p></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
                    <div className="bg-purple-100 p-4 rounded-full mr-4"><FileText className="text-purple-600" size={24} /></div>
                    <div><p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Active Records</p><p className="text-3xl font-bold">{patientRecords.length + doctorRecords.length}</p></div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                            <tr>
                                <th className="p-4 font-semibold">Email Account</th>
                                <th className="p-4 font-semibold">System Role</th>
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
                                    
                                    {/* ROLES ARE NOW READ-ONLY */}
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                                            user.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' : 
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex items-center">
                                            {/* PATIENTS ARE ALWAYS ACTIVE, DOCTORS CAN BE CHANGED */}
                                            {user.role === 'DOCTOR' ? (
                                                <>
                                                    {getStatusIcon(user.verificationStatus || 'PENDING')}
                                                    <select value={user.verificationStatus || 'PENDING'} onChange={(e) => handleStatusChange(user.id, e.target.value)} className="text-xs font-bold bg-transparent outline-none cursor-pointer">
                                                        <option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="SUSPENDED">SUSPENDED</option>
                                                    </select>
                                                </>
                                            ) : (
                                                <span className="flex items-center text-xs font-bold text-green-700">
                                                    <CheckCircle size={16} className="mr-1 text-green-600" /> ACTIVE
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => handleAuditUser(user.email, user.role)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"><Eye size={18} /></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Account Modal */}
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
                                <button type="submit" disabled={isActionLoading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center">
                                    {isActionLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null} Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Comprehensive Audit Modal */}
            {selectedAudit && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">
                                {selectedAudit.type === 'DOCTOR' ? 'Doctor Credential Audit Log' : 'Comprehensive Clinical Audit Log'}
                            </h3>
                            <button onClick={() => setSelectedAudit(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
                            {/* --- PATIENT AUDIT VIEW --- */}
                            {selectedAudit.type === 'PATIENT' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Full Legal Name</p>
                                            <p className="font-bold text-gray-900">{selectedAudit.data.firstName || '-'} {selectedAudit.data.lastName || '-'}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">ID Reference</p>
                                            <p className="font-bold text-gray-900">{selectedAudit.data.nationalId || 'Not Provided'}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Date of Birth</p>
                                            <p className="font-bold text-gray-900">{selectedAudit.data.dateOfBirth || 'Not Provided'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <MapPin className="mr-3 text-indigo-500 mt-1" size={20} />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 uppercase text-xs mb-1">Full Residence Address</p>
                                            <p className="text-sm text-gray-700">{selectedAudit.data.address || 'No address provided.'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-red-50 p-5 rounded-xl border border-red-100">
                                        <Activity className="mr-4 text-red-500 mt-1" size={24} />
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <p className="font-bold text-red-900 uppercase text-xs border-b border-red-200 pb-2 mb-2">Primary Medical Profile</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-red-700 mb-1">CHRONIC CONDITIONS</p>
                                                <p className="text-sm text-red-900 bg-white p-2 rounded border border-red-100">{selectedAudit.data.chronicConditions || 'None reported'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-red-700 mb-1">KNOWN ALLERGIES</p>
                                                <p className="text-sm text-red-900 bg-white p-2 rounded border border-red-100">{selectedAudit.data.allergies || 'None reported'}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="text-xs font-bold text-red-700 mb-1">CURRENT MEDICATIONS</p>
                                                <p className="text-sm text-red-900 bg-white p-2 rounded border border-red-100">{selectedAudit.data.currentMedications || 'None reported'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-green-50 p-5 rounded-xl border border-green-100">
                                        <Phone className="mr-4 text-green-500 mt-1" size={24} />
                                        <div className="flex-1">
                                            <p className="font-bold text-green-900 uppercase text-xs border-b border-green-200 pb-2 mb-2">Emergency Contact</p>
                                            <p className="text-sm text-green-900 font-bold">{selectedAudit.data.emergencyContactName || '-'} <span className="font-normal text-green-700">({selectedAudit.data.emergencyContactRelationship || '-'})</span></p>
                                            <p className="text-sm text-green-800 font-medium mt-1">{selectedAudit.data.emergencyContactPhone || 'No phone provided'}</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* --- DOCTOR AUDIT VIEW --- */}
                            {selectedAudit.type === 'DOCTOR' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Full Name</p>
                                            <p className="font-bold text-gray-900 text-lg">Dr. {selectedAudit.data.firstName || '-'} {selectedAudit.data.lastName || '-'}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">Phone Number</p>
                                            <p className="font-bold text-gray-900 text-lg">{selectedAudit.data.phoneNumber || 'Not Provided'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-blue-50 p-5 rounded-xl border border-blue-100">
                                        <Award className="mr-4 text-blue-500 mt-1" size={24} />
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <p className="font-bold text-blue-900 uppercase text-xs border-b border-blue-200 pb-2 mb-2">Professional Credentials</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-blue-700 mb-1">SPECIALTY</p>
                                                <p className="text-sm text-blue-900 bg-white p-2 rounded border border-blue-100">{selectedAudit.data.specialty || 'Not specified'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-blue-700 mb-1">LICENSE NUMBER</p>
                                                <p className="text-sm font-mono text-blue-900 bg-white p-2 rounded border border-blue-100">{selectedAudit.data.licenseNumber || 'Pending verification'}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="text-xs font-bold text-blue-700 mb-1">QUALIFICATIONS</p>
                                                <p className="text-sm text-blue-900 bg-white p-2 rounded border border-blue-100">{selectedAudit.data.qualifications || 'Not specified'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                                        <Building className="mr-4 text-indigo-500 mt-1" size={24} />
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <p className="font-bold text-indigo-900 uppercase text-xs border-b border-indigo-200 pb-2 mb-2">Practice & Affiliations</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-indigo-700 mb-1">HOSPITAL AFFILIATION</p>
                                                <p className="text-sm text-indigo-900 bg-white p-2 rounded border border-indigo-100">{selectedAudit.data.hospitalAffiliation || 'Independent Practice'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-indigo-700 mb-1">YEARS OF EXPERIENCE</p>
                                                <p className="text-sm text-indigo-900 bg-white p-2 rounded border border-indigo-100">{selectedAudit.data.experienceYears ? `${selectedAudit.data.experienceYears} Years` : 'Not specified'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <FileText className="mr-3 text-gray-500 mt-1" size={20} />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 uppercase text-xs mb-1">Professional Bio</p>
                                            <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded border border-gray-200">{selectedAudit.data.bio || 'No biography provided by the doctor.'}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="p-6 bg-gray-50 border-t flex justify-end shrink-0">
                            <button onClick={() => setSelectedAudit(null)} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-sm uppercase tracking-widest">
                                Close Audit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;