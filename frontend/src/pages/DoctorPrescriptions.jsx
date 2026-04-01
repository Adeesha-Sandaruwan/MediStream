import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardPlus, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyPrescriptions, issuePrescription } from '../api/doctorApi';

const initialPrescriptionState = {
  patientEmail: '',
  appointmentId: '',
  diagnosis: '',
  medications: '',
  advice: '',
  followUpDate: '',
};

export default function DoctorPrescriptions() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [prescriptionForm, setPrescriptionForm] = useState(initialPrescriptionState);
  const [prescriptions, setPrescriptions] = useState([]);

  const loadPrescriptions = useCallback(async () => {
    setError('');
    try {
      setPrescriptions(await getMyPrescriptions(token));
    } catch (err) {
      setError(err.message || 'Failed to fetch prescriptions');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadPrescriptions();
    }
  }, [loadPrescriptions, token]);

  const handleIssuePrescription = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await issuePrescription(token, {
        ...prescriptionForm,
        appointmentId: prescriptionForm.appointmentId ? Number(prescriptionForm.appointmentId) : null,
      });
      setPrescriptionForm(initialPrescriptionState);
      await loadPrescriptions();
    } catch (err) {
      setError(err.message || 'Failed to issue prescription');
    }
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading prescriptions...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/doctor-dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Back to Doctor Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Digital Prescriptions</h1>
        </div>
        <Link to="/telemedicine" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg">
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/doctor-profile" className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">Profile</Link>
        <Link to="/doctor-availability" className="text-sm px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">Availability</Link>
        <Link to="/doctor-appointments" className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700">Appointments</Link>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
