import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Video, XCircle, CalendarDays, UserRound, Hourglass } from 'lucide-react';
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

  const getStatusStyle = (status) => {
    if (status === 'ACCEPTED') return 'bg-emerald-100 text-emerald-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
    return 'bg-cyan-100 text-cyan-700';
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-gray-600">Loading appointments...</div>
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
          <h1 className="text-3xl font-black text-gray-900 mt-2 tracking-tight">Appointment Requests</h1>
        </div>
        <Link to="/telemedicine" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm">
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-700 text-white p-6 shadow-md">
        <h2 className="text-xl font-bold">Appointment Decision Center</h2>
        <p className="text-cyan-50 text-sm mt-1">Review patient requests and confirm clinical sessions with clear status tracking.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/doctor-profile" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Profile</Link>
          <Link to="/doctor-availability" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Availability</Link>
          <Link to="/doctor-prescriptions" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Prescriptions</Link>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {appointments.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 flex items-center">
                    <CalendarDays className="mr-2 text-cyan-600" size={18} />
                    Appointment #{item.appointmentId}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    <UserRound className="mr-2" size={14} />
                    Patient: {item.patientEmail}
                  </p>
                </div>

                <span className={`inline-flex items-center w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusStyle(item.status)}`}>
                  <Hourglass className="mr-1" size={12} />
                  {item.status}
                </span>
              </div>

              {item.status === 'PENDING' && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => handleAppointmentDecision(item.appointmentId, 'ACCEPTED')} className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors">
                    <CheckCircle2 className="mr-1" size={16} /> Accept
                  </button>
                  <button onClick={() => handleAppointmentDecision(item.appointmentId, 'REJECTED')} className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors">
                    <XCircle className="mr-1" size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          {appointments.length === 0 && (
            <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6 text-center">
              No appointment requests available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
