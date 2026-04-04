import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Video, UserRound, BriefcaseMedical, BadgeCheck } from 'lucide-react';
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
  doctorSignatureImage: '',
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
        doctorSignatureImage: data.doctorSignatureImage || '',
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

  const handleSignatureImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file for digital signature.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 900;
        const maxHeight = 300;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const width = Math.floor(img.width * ratio);
        const height = Math.floor(img.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Unable to process signature image.');
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        setProfile((prev) => ({ ...prev, doctorSignatureImage: compressed }));
        setError('');
      };
      img.onerror = () => setError('Unable to read signature image.');
      img.src = String(reader.result);
    };
    reader.onerror = () => setError('Unable to read signature image.');
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-gray-600">Loading doctor profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/doctor-dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium">
            &larr; Back to Doctor Dashboard
          </Link>
          <h1 className="text-3xl font-black text-gray-900 mt-2 tracking-tight">Doctor Profile</h1>
        </div>
        <Link to="/telemedicine" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm">
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 text-white p-6 shadow-md relative overflow-hidden">
        <div className="absolute -top-8 -right-4 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Professional Information</h2>
              <p className="text-blue-100 text-sm mt-1">Keep credentials and consultation details current for verification and patient trust.</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 px-3 py-1 rounded-full text-xs font-semibold w-fit">
              <BadgeCheck size={14} />
              Doctor workspace
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link to="/doctor-availability" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Availability</Link>
            <Link to="/doctor-appointments" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Appointments</Link>
            <Link to="/doctor-prescriptions" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Prescriptions</Link>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl">{success}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 xl:col-span-1 h-fit">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
            <UserRound size={30} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Profile Completeness</h3>
          <p className="text-sm text-gray-600 mt-1">Complete all fields to improve credibility and speed administrative verification.</p>
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center justify-between text-gray-700"><span>Credentials</span><span className="font-semibold">Required</span></div>
            <div className="flex items-center justify-between text-gray-700"><span>Consultation Fee</span><span className="font-semibold">Visible to patients</span></div>
            <div className="flex items-center justify-between text-gray-700"><span>Professional Bio</span><span className="font-semibold">Recommended</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 xl:col-span-2">
          <div className="flex items-center mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mr-3">
              <BriefcaseMedical size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Update Doctor Details</h2>
          </div>

          <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="First name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="Last name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="Phone number" value={profile.phoneNumber} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} />
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="Specialty" value={profile.specialty} onChange={(e) => setProfile({ ...profile, specialty: e.target.value })} />
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="Qualifications" value={profile.qualifications} onChange={(e) => setProfile({ ...profile, qualifications: e.target.value })} />
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="License number" value={profile.licenseNumber} onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })} />
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="Experience years" value={profile.experienceYears} onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value })} />
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="Consultation fee" value={profile.consultationFee} onChange={(e) => setProfile({ ...profile, consultationFee: e.target.value })} />
            <input className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none md:col-span-2" placeholder="Hospital affiliation" value={profile.hospitalAffiliation} onChange={(e) => setProfile({ ...profile, hospitalAffiliation: e.target.value })} />
            <textarea className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none md:col-span-2" rows="4" placeholder="Professional bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            <div className="md:col-span-2 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
              <p className="text-sm font-semibold text-indigo-800 mb-2">Digital Signature Image (For Prescriptions)</p>
              <input type="file" accept="image/*" onChange={handleSignatureImageUpload} className="block w-full text-sm text-gray-700" />
              {profile.doctorSignatureImage && (
                <div className="mt-3 bg-white border border-indigo-100 rounded-lg p-2 w-fit">
                  <img src={profile.doctorSignatureImage} alt="Doctor signature preview" className="h-16 object-contain" />
                </div>
              )}
            </div>
            <div className="md:col-span-2 pt-1">
              <button type="submit" className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors">
                <Save className="mr-2" size={16} /> Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
