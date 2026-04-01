import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDoctorProfile, updateDoctorProfile } from '../api/doctorApi';

const initialProfileState = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  specialty: '',
  qualifications: '',
  licenseNumber: '',
  experienceYears: '',
  consultationFee: '',
  hospitalAffiliation: '',
  bio: '',
};

export default function DoctorProfile() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState(initialProfileState);

  const loadProfile = useCallback(async () => {
    setError('');
    try {
      const data = await getDoctorProfile(token);
      setProfile({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phoneNumber: data.phoneNumber || '',
        specialty: data.specialty || '',
        qualifications: data.qualifications || '',
        licenseNumber: data.licenseNumber || '',
        experienceYears: data.experienceYears || '',
        consultationFee: data.consultationFee || '',
        hospitalAffiliation: data.hospitalAffiliation || '',
        bio: data.bio || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load doctor profile');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadProfile();
    }
  }, [loadProfile, token]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await updateDoctorProfile(token, profile);
      setSuccess('Profile updated successfully.');
      await loadProfile();
    } catch (err) {
      setError(err.message || 'Failed to save doctor profile');
    }
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading doctor profile...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/doctor-dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Back to Doctor Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Doctor Profile</h1>
        </div>
        <Link to="/telemedicine" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg">
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/doctor-availability" className="text-sm px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">Availability</Link>
        <Link to="/doctor-appointments" className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700">Appointments</Link>
        <Link to="/doctor-prescriptions" className="text-sm px-3 py-1 rounded-full bg-violet-100 text-violet-700">Prescriptions</Link>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="p-2 border rounded" placeholder="First name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
          <input className="p-2 border rounded" placeholder="Last name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
          <input className="p-2 border rounded" placeholder="Phone number" value={profile.phoneNumber} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} />
          <input className="p-2 border rounded" placeholder="Specialty" value={profile.specialty} onChange={(e) => setProfile({ ...profile, specialty: e.target.value })} />
          <input className="p-2 border rounded" placeholder="Qualifications" value={profile.qualifications} onChange={(e) => setProfile({ ...profile, qualifications: e.target.value })} />
          <input className="p-2 border rounded" placeholder="License number" value={profile.licenseNumber} onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })} />
          <input className="p-2 border rounded" placeholder="Experience years" value={profile.experienceYears} onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value })} />
          <input className="p-2 border rounded" placeholder="Consultation fee" value={profile.consultationFee} onChange={(e) => setProfile({ ...profile, consultationFee: e.target.value })} />
          <input className="p-2 border rounded md:col-span-2" placeholder="Hospital affiliation" value={profile.hospitalAffiliation} onChange={(e) => setProfile({ ...profile, hospitalAffiliation: e.target.value })} />
          <textarea className="p-2 border rounded md:col-span-2" rows="3" placeholder="Professional bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
          <div className="md:col-span-2">
            <button type="submit" className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg">
              <Save className="mr-2" size={16} /> Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
