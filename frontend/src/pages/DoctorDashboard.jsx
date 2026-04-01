import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ClipboardPlus, Save, Trash2, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  decideAppointment,
  getDoctorAppointments,
  getDoctorProfile,
  getMyAvailability,
  getMyPrescriptions,
  issuePrescription,
  updateDoctorProfile,
} from '../api/doctorApi';

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

const initialAvailabilityState = {
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '10:00',
  active: true,
};

const initialPrescriptionState = {
  patientEmail: '',
  appointmentId: '',
  diagnosis: '',
  medications: '',
  advice: '',
  followUpDate: '',
};

export default function DoctorDashboard() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(initialProfileState);
  const [availabilityForm, setAvailabilityForm] = useState(initialAvailabilityState);
  const [prescriptionForm, setPrescriptionForm] = useState(initialPrescriptionState);
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  const loadDashboard = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      const [profileData, availabilityData, appointmentData, prescriptionData] = await Promise.all([
        getDoctorProfile(token),
        getMyAvailability(token),
        getDoctorAppointments(token),
        getMyPrescriptions(token),
      ]);
      setProfile({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        phoneNumber: profileData.phoneNumber || '',
        specialty: profileData.specialty || '',
        qualifications: profileData.qualifications || '',
        licenseNumber: profileData.licenseNumber || '',
        experienceYears: profileData.experienceYears || '',
        consultationFee: profileData.consultationFee || '',
        hospitalAffiliation: profileData.hospitalAffiliation || '',
        bio: profileData.bio || '',
      });
      setAvailability(availabilityData || []);
      setAppointments(appointmentData || []);
      setPrescriptions(prescriptionData || []);
    } catch (err) {
      setError(err.message || 'Failed to load doctor dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [loadDashboard, token]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateDoctorProfile(token, profile);
      await loadDashboard();
    } catch (err) {
      setError(err.message || 'Failed to save doctor profile');
    }
  };

  const handleCreateAvailability = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createAvailabilitySlot(token, availabilityForm);
      setAvailabilityForm(initialAvailabilityState);
      setAvailability(await getMyAvailability(token));
    } catch (err) {
      setError(err.message || 'Failed to create availability slot');
    }
  };

  const handleDeleteAvailability = async (slotId) => {
    setError('');
    try {
      await deleteAvailabilitySlot(token, slotId);
      setAvailability(await getMyAvailability(token));
    } catch (err) {
      setError(err.message || 'Failed to delete availability slot');
    }
  };

  const handleAppointmentDecision = async (appointmentId, status) => {
    setError('');
    try {
      await decideAppointment(token, appointmentId, { status, doctorNotes: '' });
      setAppointments(await getDoctorAppointments(token));
    } catch (err) {
      setError(err.message || 'Failed to update appointment decision');
    }
  };

  const handleIssuePrescription = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await issuePrescription(token, {
        ...prescriptionForm,
        appointmentId: prescriptionForm.appointmentId ? Number(prescriptionForm.appointmentId) : null,
      });
      setPrescriptionForm(initialPrescriptionState);
      setPrescriptions(await getMyPrescriptions(token));
    } catch (err) {
      setError(err.message || 'Failed to issue prescription');
    }
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading doctor dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
        <Link
          to="/telemedicine"
          className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg"
        >
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Doctor Profile</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Availability</h2>
          <form onSubmit={handleCreateAvailability} className="grid grid-cols-2 gap-3 mb-4">
            <select className="p-2 border rounded col-span-2" value={availabilityForm.dayOfWeek} onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: e.target.value })}>
              {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input type="time" className="p-2 border rounded" value={availabilityForm.startTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })} />
            <input type="time" className="p-2 border rounded" value={availabilityForm.endTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })} />
            <button type="submit" className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">Add Slot</button>
          </form>
          <div className="space-y-2">
            {availability.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between border rounded p-2">
                <div className="text-sm">
                  <CalendarClock className="inline mr-2" size={15} />
                  {slot.dayOfWeek} {slot.startTime} - {slot.endTime}
                </div>
                <button onClick={() => handleDeleteAvailability(slot.id)} className="text-red-600 hover:text-red-700">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {availability.length === 0 && <p className="text-sm text-gray-500">No availability slots yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Appointment Requests</h2>
          <div className="space-y-2">
            {appointments.map((item) => (
              <div key={item.id} className="border rounded p-3">
                <p className="font-medium text-gray-800">Appointment #{item.appointmentId}</p>
                <p className="text-sm text-gray-600">Patient: {item.patientEmail}</p>
                <p className="text-sm text-gray-600 mb-2">Status: {item.status}</p>
                {item.status === 'PENDING' && (
                  <div className="space-x-2">
                    <button onClick={() => handleAppointmentDecision(item.appointmentId, 'ACCEPTED')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">Accept</button>
                    <button onClick={() => handleAppointmentDecision(item.appointmentId, 'REJECTED')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">Reject</button>
                  </div>
                )}
              </div>
            ))}
            {appointments.length === 0 && <p className="text-sm text-gray-500">No appointment requests available.</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Digital Prescriptions</h2>
        <form onSubmit={handleIssuePrescription} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <input className="p-2 border rounded" placeholder="Patient email" value={prescriptionForm.patientEmail} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientEmail: e.target.value })} required />
          <input className="p-2 border rounded" placeholder="Appointment ID (optional)" value={prescriptionForm.appointmentId} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, appointmentId: e.target.value })} />
          <input className="p-2 border rounded md:col-span-2" placeholder="Diagnosis" value={prescriptionForm.diagnosis} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })} required />
          <textarea className="p-2 border rounded md:col-span-2" rows="2" placeholder="Medications" value={prescriptionForm.medications} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medications: e.target.value })} required />
          <textarea className="p-2 border rounded md:col-span-2" rows="2" placeholder="Advice" value={prescriptionForm.advice} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, advice: e.target.value })} />
          <input className="p-2 border rounded" placeholder="Follow-up date (YYYY-MM-DD)" value={prescriptionForm.followUpDate} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, followUpDate: e.target.value })} />
          <button type="submit" className="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
            <ClipboardPlus className="mr-2" size={16} /> Issue Prescription
          </button>
        </form>
        <div className="space-y-2">
          {prescriptions.map((item) => (
            <div key={item.id} className="border rounded p-3">
              <p className="font-medium text-gray-800">{item.patientEmail}</p>
              <p className="text-sm text-gray-600">Diagnosis: {item.diagnosis}</p>
              <p className="text-sm text-gray-600">Issued: {item.issuedAt}</p>
            </div>
          ))}
          {prescriptions.length === 0 && <p className="text-sm text-gray-500">No prescriptions issued yet.</p>}
        </div>
      </div>
    </div>
  );
}
