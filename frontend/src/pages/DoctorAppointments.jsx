import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Video, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { decideAppointment, getDoctorAppointments } from '../api/doctorApi';

export default function DoctorAppointments() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState([]);

  const loadAppointments = useCallback(async () => {
    setError('');
    try {
      setAppointments(await getDoctorAppointments(token));
    } catch (err) {
      setError(err.message || 'Failed to fetch appointment requests');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadAppointments();
    }
  }, [loadAppointments, token]);

  const handleAppointmentDecision = async (appointmentId, status) => {
    setError('');
    try {
      await decideAppointment(token, appointmentId, { status, doctorNotes: '' });
      await loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to update appointment decision');
    }
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading appointments...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/doctor-dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Back to Doctor Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Appointment Requests</h1>
        </div>
        <Link to="/telemedicine" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg">
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/doctor-profile" className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">Profile</Link>
        <Link to="/doctor-availability" className="text-sm px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">Availability</Link>
        <Link to="/doctor-prescriptions" className="text-sm px-3 py-1 rounded-full bg-violet-100 text-violet-700">Prescriptions</Link>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-2">
          {appointments.map((item) => (
            <div key={item.id} className="border rounded p-3">
              <p className="font-medium text-gray-800">Appointment #{item.appointmentId}</p>
              <p className="text-sm text-gray-600">Patient: {item.patientEmail}</p>
              <p className="text-sm text-gray-600 mb-2">Status: {item.status}</p>
              {item.status === 'PENDING' && (
                <div className="space-x-2">
                  <button onClick={() => handleAppointmentDecision(item.appointmentId, 'ACCEPTED')} className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                    <CheckCircle2 className="mr-1" size={16} /> Accept
                  </button>
                  <button onClick={() => handleAppointmentDecision(item.appointmentId, 'REJECTED')} className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                    <XCircle className="mr-1" size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          {appointments.length === 0 && <p className="text-sm text-gray-500">No appointment requests available.</p>}
        </div>
      </div>
    </div>
  );
}
