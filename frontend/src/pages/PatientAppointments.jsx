import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getMyPatientProfile } from '../api/patientApi';
import { CalendarDays, AlertCircle, Loader2, Clock3, UserRound } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_APPOINTMENT_API_URL || 'http://localhost:8086/api/v1/appointments';

const statusStyles = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export default function PatientAppointments() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patientId, setPatientId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAppointments = async () => {
      setIsLoading(true);
      setError('');

      try {
        const patientProfile = await getMyPatientProfile(token);
        setPatientId(patientProfile.id);

        const response = await axios.get(`${API_BASE_URL}/patient/${patientProfile.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const sorted = [...response.data].sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
        setAppointments(sorted);
      } catch (err) {
        console.error(err);
        setError('Failed to load your appointments. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadAppointments();
    }
  }, [token]);

  const hasPaymentPending = (appointment) => appointment.status === 'PENDING';
  const canDeleteAppointment = (appointment) => ['PENDING', 'APPROVED'].includes(appointment.status);
  const canPayAppointment = (appointment) => appointment.status === 'PENDING';

  const handlePayNow = (appointment) => {
    // Placeholder until payment service integration is implemented.
    window.alert(`Payment flow will be integrated soon for appointment #${appointment.id}.`);
  };

  const handleDeleteAppointment = async (appointment) => {
    if (!canDeleteAppointment(appointment)) {
      setError('Only pending or approved appointments can be deleted.');
      return;
    }

    const confirmed = window.confirm(`Delete appointment #${appointment.id}? This will cancel it.`);
    if (!confirmed) {
      return;
    }

    setDeletingId(appointment.id);
    setError('');
    setNotice('');

    try {
      await axios.delete(`${API_BASE_URL}/${appointment.id}/cancel`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setAppointments((prev) => prev.filter((item) => item.id !== appointment.id));
      setNotice(`Appointment #${appointment.id} was deleted successfully.`);
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || 'Failed to delete appointment. Please try again.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link to="/patient-dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-600 mt-2">Appointments you have booked. Items marked pending are waiting for payment/processing.</p>
        </div>
        {patientId && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-800">
            Patient ID: <span className="font-bold">{patientId}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start">
          <AlertCircle className="mr-2 mt-0.5 shrink-0" size={20} />
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
          <p>{notice}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-medium">Loading your appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CalendarDays className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Appointments Found</h3>
          <p className="text-gray-500">You have not booked any appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                    <CalendarDays className="text-indigo-600" size={18} />
                    Appointment #{appointment.id}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <UserRound size={14} /> Doctor ID: {appointment.doctorId}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={14} /> {new Date(appointment.appointmentDate).toLocaleString()}
                    </span>
                    <span>{appointment.durationMinutes} min</span>
                  </div>
                  <p className="mt-3 text-gray-700"><span className="font-semibold">Reason:</span> {appointment.reason}</p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusStyles[appointment.status] || 'bg-gray-100 text-gray-700'}`}>
                    {appointment.status}
                  </span>
                  {hasPaymentPending(appointment) && (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
                      Pending Payment
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePayNow(appointment)}
                    disabled={!canPayAppointment(appointment)}
                    className="mt-1 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    Pay Now
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAppointment(appointment)}
                    disabled={!canDeleteAppointment(appointment) || deletingId === appointment.id}
                    className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-rose-300"
                  >
                    {deletingId === appointment.id ? 'Deleting...' : 'Delete Appointment'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}