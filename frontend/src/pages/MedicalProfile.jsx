import React, { useState, useEffect } from 'react';
import { getMedicalProfile, updateMedicalProfile } from '../api/patientApi';
import { useAuth } from '../context/AuthContext';
import { Save, User, Activity, Phone, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

const MedicalProfile = () => {
    const { token } = useAuth();
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        nationalId: '',
        bloodGroup: '',
        allergies: '',
        currentMedications: '',
        chronicConditions: '',
        pastSurgeries: '',
        familyMedicalHistory: '',
        emergencyContactName: '',
        emergencyContactRelationship: '',
        emergencyContactPhone: ''
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                const data = await getMedicalProfile(token);
                setFormData({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    phoneNumber: data.phoneNumber || '',
                    dateOfBirth: data.dateOfBirth || '',
                    gender: data.gender || '',
                    address: data.address || '',
                    nationalId: data.nationalId || '',
                    bloodGroup: data.bloodGroup || '',
                    allergies: data.allergies || '',
                    currentMedications: data.currentMedications || '',
                    chronicConditions: data.chronicConditions || '',
                    pastSurgeries: data.pastSurgeries || '',
                    familyMedicalHistory: data.familyMedicalHistory || '',
                    emergencyContactName: data.emergencyContactName || '',
                    emergencyContactRelationship: data.emergencyContactRelationship || '',
                    emergencyContactPhone: data.emergencyContactPhone || ''
                });
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        
        if (!token) {
            setMessage({ text: 'Authentication error. Please log in again.', type: 'error' });
            setIsSaving(false);
            return;
        }

        try {
            await updateMedicalProfile(token, formData);
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 4000);
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Failed to save profile. Please try again.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-gray-500 font-medium">Loading your medical records...</p>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-radial-[at_20%_10%] from-cyan-100 via-white to-indigo-50" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <section className="rounded-3xl border border-cyan-100 bg-linear-to-r from-cyan-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl shadow-cyan-400/20 mb-8">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide">
                     PATIENT PROFILE
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Patient Medical Profile</h2>
                    <p className="text-cyan-50 mt-2">Keep your records up to date for accurate and safer care.</p>
                    <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-100 uppercase tracking-wide">
                        <ShieldCheck size={14} /> Confidential information is protected
                    </p>
                </section>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    {message.text && (
                        <div className={`mx-6 sm:mx-8 mt-6 p-4 rounded-lg font-medium flex items-center ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-10">
                        <section className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                            <div className="flex items-center mb-4 border-b border-slate-100 pb-2">
                                <User className="text-indigo-600 mr-2" size={20} />
                                <h3 className="text-lg font-bold text-slate-800">1. Personal Information</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">National ID / Passport</label>
                                    <input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                    <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                                    <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                            <div className="flex items-center mb-4 border-b border-slate-100 pb-2">
                                <Activity className="text-indigo-600 mr-2" size={20} />
                                <h3 className="text-lg font-bold text-slate-800">2. Medical Background</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                                    <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white md:w-1/2">
                                        <option value="">Select Blood Group</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Known Allergies</label>
                                    <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows="2" placeholder="List any food, drug, or environmental allergies..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Chronic Conditions</label>
                                    <textarea name="chronicConditions" value={formData.chronicConditions} onChange={handleChange} rows="2" placeholder="e.g., Asthma, Diabetes, Hypertension..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Medications</label>
                                    <textarea name="currentMedications" value={formData.currentMedications} onChange={handleChange} rows="2" placeholder="List medications and dosages..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Past Surgeries</label>
                                    <textarea name="pastSurgeries" value={formData.pastSurgeries} onChange={handleChange} rows="2" placeholder="Include approximate dates if possible..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Family Medical History</label>
                                    <textarea name="familyMedicalHistory" value={formData.familyMedicalHistory} onChange={handleChange} rows="2" placeholder="Relevant hereditary conditions..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                            <div className="flex items-center mb-4 border-b border-slate-100 pb-2">
                                <Phone className="text-indigo-600 mr-2" size={20} />
                                <h3 className="text-lg font-bold text-slate-800">3. Emergency Contact</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                                    <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                                    <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleChange} placeholder="e.g., Spouse, Parent" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                    <input type="text" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                        </section>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:bg-indigo-400"
                            >
                                {isSaving ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save className="mr-2" size={20} />}
                                {isSaving ? 'Saving Changes...' : 'Save Complete Profile'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MedicalProfile;