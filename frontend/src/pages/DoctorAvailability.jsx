import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Trash2, Video, Clock3, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createAvailabilitySlot, deleteAvailabilitySlot, getMyAvailability } from '../api/doctorApi';

const initialAvailabilityState = {
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '10:00',
  active: true,
};

export default function DoctorAvailability() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [availabilityForm, setAvailabilityForm] = useState(initialAvailabilityState);
  const [availability, setAvailability] = useState([]);

  const loadAvailability = useCallback(async () => {
    setError('');
    try {
      setAvailability(await getMyAvailability(token));
    } catch (err) {
      setError(err.message || 'Failed to fetch availability');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadAvailability();
    }
  }, [loadAvailability, token]);

  const handleCreateAvailability = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createAvailabilitySlot(token, availabilityForm);
      setAvailabilityForm(initialAvailabilityState);
      await loadAvailability();
    } catch (err) {
      setError(err.message || 'Failed to create availability slot');
    }
  };

  const handleDeleteAvailability = async (slotId) => {
    setError('');
    try {
      await deleteAvailabilitySlot(token, slotId);
      await loadAvailability();
    } catch (err) {
      setError(err.message || 'Failed to delete availability slot');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-gray-600">Loading availability...</div>
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
          <h1 className="text-3xl font-black text-gray-900 mt-2 tracking-tight">Doctor Availability</h1>
        </div>
        <Link to="/telemedicine" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm">
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 text-white p-6 shadow-md">
        <h2 className="text-xl font-bold">Consultation Schedule</h2>
        <p className="text-indigo-100 text-sm mt-1">Create active weekly slots so patients can discover your next available windows.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/doctor-profile" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Profile</Link>
          <Link to="/doctor-appointments" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Appointments</Link>
          <Link to="/doctor-prescriptions" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Prescriptions</Link>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 xl:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Slot</h2>
          <form onSubmit={handleCreateAvailability} className="space-y-3">
            <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={availabilityForm.dayOfWeek} onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: e.target.value })}>
            {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="time" className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={availabilityForm.startTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })} />
              <input type="time" className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={availabilityForm.endTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })} />
            </div>
            <button type="submit" className="w-full inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors">
              <PlusCircle className="mr-2" size={16} /> Add Slot
            </button>
          </form>

          <div className="mt-5 rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-sm text-indigo-800">
            Patients can only see slots marked active in your doctor service.
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 xl:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Published Availability</h2>
          <div className="space-y-3">
            {availability.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between border border-gray-200 rounded-xl p-3 hover:shadow-sm transition-shadow">
                <div className="text-sm text-gray-700">
                  <div className="font-semibold text-gray-900 flex items-center mb-1">
                    <CalendarClock className="mr-2 text-indigo-600" size={16} />
                    {slot.dayOfWeek}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock3 className="mr-2" size={14} />
                    {slot.startTime} - {slot.endTime}
                  </div>
                </div>
                <button onClick={() => handleDeleteAvailability(slot.id)} className="inline-flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {availability.length === 0 && (
              <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                No availability slots yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
