import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Trash2, Video, Clock3, PlusCircle, PencilLine, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createAvailabilitySlot, deleteAvailabilitySlot, getMyAvailability, updateAvailabilitySlot } from '../api/doctorApi';

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
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editForm, setEditForm] = useState(initialAvailabilityState);

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

  const handleStartEdit = (slot) => {
    setError('');
    setEditingSlotId(slot.id);
    setEditForm({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime?.slice(0, 5) || '09:00',
      endTime: slot.endTime?.slice(0, 5) || '10:00',
      active: Boolean(slot.active),
    });
  };

  const handleCancelEdit = () => {
    setEditingSlotId(null);
    setEditForm(initialAvailabilityState);
  };

  const handleUpdateAvailability = async (slotId) => {
    setError('');
    if (editForm.startTime >= editForm.endTime) {
      setError('End time must be later than start time.');
      return;
    }
    try {
      await updateAvailabilitySlot(token, slotId, editForm);
      setEditingSlotId(null);
      setEditForm(initialAvailabilityState);
      await loadAvailability();
    } catch (err) {
      setError(err.message || 'Failed to update availability slot');
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
              <div key={slot.id} className="border border-gray-200 rounded-xl p-3 hover:shadow-sm transition-shadow">
                {editingSlotId === slot.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={editForm.dayOfWeek} onChange={(e) => setEditForm({ ...editForm, dayOfWeek: e.target.value })}>
                        {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <input type="time" className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
                      <input type="time" className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} />
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={editForm.active}
                        onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Visible to patients (Active)
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleUpdateAvailability(slot.id)} className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors">
                        <Save className="mr-1" size={15} /> Save
                      </button>
                      <button onClick={handleCancelEdit} className="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-semibold transition-colors">
                        <X className="mr-1" size={15} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold text-gray-900 flex items-center mb-1">
                        <CalendarClock className="mr-2 text-indigo-600" size={16} />
                        {slot.dayOfWeek}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${slot.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {slot.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock3 className="mr-2" size={14} />
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStartEdit(slot)} className="inline-flex items-center text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors">
                        <PencilLine size={16} />
                      </button>
                      <button onClick={() => handleDeleteAvailability(slot.id)} className="inline-flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
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
