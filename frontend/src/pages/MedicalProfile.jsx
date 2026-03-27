import React, { useState, useEffect } from 'react';
import { getMedicalProfile, updateMedicalProfile } from '../api/patientApi';
import { useAuth } from '../context/AuthContext'; // Using your Auth context!

const MedicalProfile = () => {
    const { token } = useAuth(); // Safely grab the token directly from your context

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        bloodGroup: '',
        emergencyContact: '',
        allergies: '',
        currentMedications: ''
    });

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setLoading(false);
                return; // Stop if there is no token
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
                    bloodGroup: data.bloodGroup || '',
                    emergencyContact: data.emergencyContact || '',
                    allergies: data.allergies || '',
                    currentMedications: data.currentMedications || ''
                });
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Saving...');
        
        if (!token) {
            setMessage('Authentication error. Please log in again.');
            return;
        }

        try {
            await updateMedicalProfile(token, formData);
            setMessage('Medical profile updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("API Error:", error);
            setMessage('Error saving profile. Check console for details.');
        }
    };

    if (loading) return <div className="text-center py-10">Loading medical records...</div>;

    return (
        <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100 max-w-2xl mx-auto mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Medical Profile</h2>
            
            {message && (
                <div className={`p-4 mb-6 rounded-lg font-medium ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Phone Number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} placeholder="Emergency Contact" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>

                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Full Address" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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

                <textarea name="allergies" value={formData.allergies} onChange={handleChange} placeholder="List any allergies..." rows="3" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                
                <textarea name="currentMedications" value={formData.currentMedications} onChange={handleChange} placeholder="List current medications..." rows="3" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md">
                    Save Medical Profile
                </button>
            </form>
        </div>
    );
};

export default MedicalProfile;