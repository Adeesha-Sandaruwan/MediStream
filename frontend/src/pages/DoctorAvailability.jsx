import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Trash2, Video } from 'lucide-react';
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
    return <div className="max-w-7xl mx-auto px-4 py-10">Loading availability...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/doctor-dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
            &larr; Back to Doctor Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Doctor Availability</h1>
        </div>
        <Link to="/telemedicine" className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg">
          <Video className="mr-2" size={18} /> Open Telemedicine
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/doctor-profile" className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700">Profile</Link>
        <Link to="/doctor-appointments" className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700">Appointments</Link>
        <Link to="/doctor-prescriptions" className="text-sm px-3 py-1 rounded-full bg-violet-100 text-violet-700">Prescriptions</Link>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Manage Slots</h2>
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
    </div>
  );
}
