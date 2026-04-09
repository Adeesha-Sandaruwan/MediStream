import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Video, XCircle, CalendarDays, UserRound, Hourglass, ClipboardCheck, Clock3, FileText, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { completeAppointment, decideAppointment, getDoctorAppointments } from '../api/doctorApi';

const APPOINTMENT_API_BASE = import.meta.env.VITE_APPOINTMENT_API_URL || 'http://localhost:8086/api/v1/appointments';

export default function DoctorAppointments() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [completingId, setCompletingId] = useState(null);

  // Notes modal state
  const [notesModal, setNotesModal] = useState(null); // { appointmentId, status }
  const [doctorNotes, setDoctorNotes] = useState('');

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

  const openDecisionModal = (appointmentId, status) => {
    setDoctorNotes('');
    setNotesModal({ appointmentId, status });
  };

  const handleAppointmentDecision = async () => {
    if (!notesModal) return;
    const { appointmentId, status } = notesModal;
    setError('');
    setNotesModal(null);
    try {
      await decideAppointment(token, appointmentId, { status, doctorNotes });
      await loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to update appointment decision');
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    setError('');
    if (!window.confirm('Mark this appointment as completed?')) return;
    setCompletingId(appointmentId);
    try {
      // Update doctor service (source of truth for doctor's view)
      await completeAppointment(token, appointmentId);

      // Also sync the appointment service so the patient sees COMPLETED status.
      // Silently ignore if the appointment service rejects (e.g. payment not yet confirmed).
      try {
        await fetch(`${APPOINTMENT_API_BASE}/${appointmentId}/complete`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      } catch {
        // Non-fatal – doctor service update already succeeded
      }

      await loadAppointments();
    } catch (err) {
      setError(err.message || 'Failed to complete appointment');
    } finally {
      setCompletingId(null);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'ACCEPTED' || status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
    if (status === 'COMPLETED') return 'bg-blue-100 text-blue-700';
    if (status === 'CANCELLED') return 'bg-gray-100 text-gray-600';
    return 'bg-cyan-100 text-cyan-700';
  };

  const formatScheduledAt = (scheduledAt) => {
    if (!scheduledAt) return null;
    try {
      return new Date(scheduledAt).toLocaleString(undefined, {
        weekday: 'short', year: 'numeric', month: 'short',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return scheduledAt;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-gray-600">Loading appointments...</div>
      </div>
    );
  }

  const pending = appointments.filter((a) => a.status === 'PENDING');
  const accepted = appointments.filter((a) => a.status === 'ACCEPTED' || a.status === 'APPROVED');
  const others = appointments.filter((a) => !['PENDING', 'ACCEPTED', 'APPROVED'].includes(a.status));

  const renderCard = (item) => (
    <div key={item.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow bg-white">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <p className="font-bold text-gray-900 flex items-center">
            <CalendarDays className="mr-2 text-cyan-600 shrink-0" size={18} />
            Appointment #{item.appointmentId}
          </p>
          <p className="text-sm text-gray-600 flex items-center">
            <UserRound className="mr-2 shrink-0" size={14} />
            Patient: <span className="font-medium ml-1">{item.patientEmail}</span>
          </p>
          {item.scheduledAt && (
            <p className="text-sm text-gray-600 flex items-center">
              <Clock3 className="mr-2 shrink-0" size={14} />
              Scheduled: <span className="font-medium ml-1">{formatScheduledAt(item.scheduledAt)}</span>
            </p>
          )}
          {item.doctorNotes && (
            <p className="text-sm text-gray-600 flex items-start">
              <FileText className="mr-2 mt-0.5 shrink-0" size={14} />
              <span>Notes: <span className="font-medium">{item.doctorNotes}</span></span>
            </p>
          )}
        </div>

        <span className={`inline-flex items-center w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusStyle(item.status)}`}>
          <Hourglass className="mr-1" size={12} />
          {item.status}
        </span>
      </div>

      {item.status === 'PENDING' && (
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => openDecisionModal(item.appointmentId, 'ACCEPTED')}
            className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <CheckCircle2 className="mr-1" size={16} /> Accept
          </button>
          <button
            onClick={() => openDecisionModal(item.appointmentId, 'REJECTED')}
            className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <XCircle className="mr-1" size={16} /> Reject
          </button>
        </div>
      )}

      {(item.status === 'ACCEPTED' || item.status === 'APPROVED') && (
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => handleCompleteAppointment(item.appointmentId)}
            disabled={completingId === item.appointmentId}
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <ClipboardCheck className="mr-1" size={16} />
            {completingId === item.appointmentId ? 'Completing…' : 'Mark as Completed'}
          </button>
        </div>
      )}
    </div>
  );

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

      {/* Pending Requests */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          Pending Requests
          {pending.length > 0 && (
            <span className="ml-1 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </h2>
        <div className="space-y-4">
          {pending.length > 0 ? pending.map(renderCard) : (
            <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6 text-center">No pending requests.</p>
          )}
        </div>
      </section>

      {/* Accepted / Approved */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Accepted Appointments
          {accepted.length > 0 && (
            <span className="ml-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{accepted.length}</span>
          )}
        </h2>
        <div className="space-y-4">
          {accepted.length > 0 ? accepted.map(renderCard) : (
            <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6 text-center">No accepted appointments.</p>
          )}
        </div>
      </section>

      {/* Other (Rejected / Completed / Cancelled) */}
      {others.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
            Past & Closed
          </h2>
          <div className="space-y-4">
            {others.map(renderCard)}
          </div>
        </section>
      )}

      {appointments.length === 0 && (
        <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6 text-center">
          No appointment requests available.
        </div>
      )}

      {/* Decision Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {notesModal.status === 'ACCEPTED' ? '✅ Accept Appointment' : '❌ Reject Appointment'}
              </h3>
              <button onClick={() => setNotesModal(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Appointment <span className="font-bold">#{notesModal.appointmentId}</span> will be{' '}
                <span className={notesModal.status === 'ACCEPTED' ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                  {notesModal.status.toLowerCase()}
                </span>.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Doctor Notes (optional)</label>
                <textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes for the patient..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setNotesModal(null)} className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAppointmentDecision}
                className={`px-5 py-2 text-white font-semibold rounded-xl transition-colors ${notesModal.status === 'ACCEPTED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Confirm {notesModal.status === 'ACCEPTED' ? 'Accept' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
