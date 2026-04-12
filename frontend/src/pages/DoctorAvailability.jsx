import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Trash2, Video, Clock3, PlusCircle, PencilLine, Save, X, Sparkles, BadgeCheck, CalendarRange, Waves } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createAvailabilitySlot, deleteAvailabilitySlot, getMyAvailability, updateAvailabilitySlot } from '../api/doctorApi';

const initialAvailabilityState = {
  scheduleType: 'WEEKLY',
  slotType: 'CONSULTATION',
  dayOfWeek: 'MONDAY',
  specificDate: '',
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

  const consultationCount = availability.filter((slot) => (slot.slotType || 'CONSULTATION') === 'CONSULTATION').length;
  const leaveCount = availability.filter((slot) => (slot.slotType || 'CONSULTATION') === 'LEAVE').length;
  const activeCount = availability.filter((slot) => Boolean(slot.active)).length;

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
    if (availabilityForm.startTime >= availabilityForm.endTime) {
      setError('End time must be later than start time.');
      return;
    }

    if (availabilityForm.scheduleType === 'DATE' && !availabilityForm.specificDate) {
      setError('Please select an upcoming date for date-based slots.');
      return;
    }

    const payload = {
      dayOfWeek: availabilityForm.scheduleType === 'DATE'
        ? new Date(`${availabilityForm.specificDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
        : availabilityForm.dayOfWeek,
      specificDate: availabilityForm.scheduleType === 'DATE' ? availabilityForm.specificDate : null,
      startTime: availabilityForm.startTime,
      endTime: availabilityForm.endTime,
      slotType: availabilityForm.slotType,
      active: availabilityForm.slotType === 'LEAVE' ? false : true,
    };

    try {
      await createAvailabilitySlot(token, payload);
      setAvailabilityForm(initialAvailabilityState);
      await loadAvailability();
    } catch (err) {
      setError(err.message || 'Failed to create availability slot');
    }
  };

  const handleDeleteAvailability = async (slotId) => {
    setError('');
    if (!window.confirm('Delete this availability slot? This action cannot be undone.')) {
      return;
    }
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
      scheduleType: slot.specificDate ? 'DATE' : 'WEEKLY',
      slotType: slot.slotType || 'CONSULTATION',
      dayOfWeek: slot.dayOfWeek,
      specificDate: slot.specificDate || '',
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

    if (editForm.scheduleType === 'DATE' && !editForm.specificDate) {
      setError('Please select an upcoming date for date-based slots.');
      return;
    }

    const payload = {
      dayOfWeek: editForm.scheduleType === 'DATE'
        ? new Date(`${editForm.specificDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
        : editForm.dayOfWeek,
      specificDate: editForm.scheduleType === 'DATE' ? editForm.specificDate : null,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      slotType: editForm.slotType,
      active: editForm.slotType === 'LEAVE' ? false : editForm.active,
    };

    try {
      await updateAvailabilitySlot(token, slotId, payload);
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

  const renderSlotBadge = (slot) => (
    <>
      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${slot.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
        {slot.active ? 'Active' : 'Inactive'}
      </span>
      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${(slot.slotType || 'CONSULTATION') === 'LEAVE' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
        {(slot.slotType || 'CONSULTATION') === 'LEAVE' ? 'Leave' : 'Consultation'}
      </span>
      {slot.specificDate && (
        <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold bg-cyan-100 text-cyan-700">
          Date Slot
        </span>
      )}
    </>
  );

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

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 p-6 text-white shadow-md">
        <div className="absolute -top-10 right-0 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-cyan-200/20 blur-2xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
            <Sparkles size={14} /> Availability Studio
          </div>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Consultation Schedule</h2>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100">Shape a clear weekly rhythm, block leave instantly, and keep patient-facing availability easy to understand.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/doctor-profile" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Profile</Link>
                <Link to="/doctor-appointments" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Appointments</Link>
                <Link to="/doctor-prescriptions" className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Prescriptions</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-cyan-100"><BadgeCheck size={16} /> Active</div>
                <p className="mt-2 text-2xl font-black">{activeCount}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-cyan-100"><CalendarRange size={16} /> Consultations</div>
                <p className="mt-2 text-2xl font-black">{consultationCount}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-cyan-100"><Waves size={16} /> Leave Blocks</div>
                <p className="mt-2 text-2xl font-black">{leaveCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 xl:col-span-1 h-fit">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Slot</h2>
              <p className="text-sm text-gray-600 mt-1">Create a recurring clinic window or reserve a specific date.</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <PlusCircle size={22} />
            </div>
          </div>
          <form onSubmit={handleCreateAvailability} className="space-y-3">
            <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={availabilityForm.slotType} onChange={(e) => setAvailabilityForm({ ...availabilityForm, slotType: e.target.value })}>
              <option value="CONSULTATION">Consultation Slot</option>
              <option value="LEAVE">Time-off / Leave</option>
            </select>

            <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={availabilityForm.scheduleType} onChange={(e) => setAvailabilityForm({ ...availabilityForm, scheduleType: e.target.value })}>
              <option value="WEEKLY">Weekly recurring slot</option>
              <option value="DATE">Specific upcoming date</option>
            </select>

            {availabilityForm.scheduleType === 'WEEKLY' ? (
              <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={availabilityForm.dayOfWeek} onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: e.target.value })}>
                {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                value={availabilityForm.specificDate}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, specificDate: e.target.value })}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <input type="time" className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={availabilityForm.startTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })} />
              <input type="time" className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={availabilityForm.endTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })} />
            </div>
            <button type="submit" className="w-full inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors">
              <PlusCircle className="mr-2" size={16} /> Add Slot
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-100 p-4 text-sm text-indigo-800">
            Add consultation availability or mark leave for weekly/date slots. Leave slots are hidden from patients automatically.
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 xl:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Published Availability</h2>
              <p className="text-sm text-gray-600 mt-1">Patients see active consultation slots. Edit or remove entries inline.</p>
            </div>
            <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 w-fit">
              {availability.length} total slots configured
            </div>
          </div>
          <div className="space-y-3">
            {availability.map((slot) => (
              <div key={slot.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-sm transition-shadow bg-gradient-to-r from-white to-slate-50/60">
                {editingSlotId === slot.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={editForm.slotType} onChange={(e) => setEditForm({ ...editForm, slotType: e.target.value })}>
                        <option value="CONSULTATION">Consultation</option>
                        <option value="LEAVE">Leave</option>
                      </select>
                      <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={editForm.scheduleType} onChange={(e) => setEditForm({ ...editForm, scheduleType: e.target.value })}>
                        <option value="WEEKLY">Weekly</option>
                        <option value="DATE">Specific Date</option>
                      </select>
                      {editForm.scheduleType === 'WEEKLY' ? (
                        <select className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={editForm.dayOfWeek} onChange={(e) => setEditForm({ ...editForm, dayOfWeek: e.target.value })}>
                          {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                          value={editForm.specificDate}
                          onChange={(e) => setEditForm({ ...editForm, specificDate: e.target.value })}
                        />
                      )}
                      <input type="time" className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
                    </div>
                    <input type="time" className="px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} />

                    {editForm.slotType === 'CONSULTATION' && (
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editForm.active}
                          onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Visible to patients (Active)
                      </label>
                    )}

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
                        {slot.specificDate
                          ? new Date(`${slot.specificDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
                          : slot.dayOfWeek}
                        {renderSlotBadge(slot)}
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
              <div className="text-center rounded-3xl border border-dashed border-gray-300 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <CalendarClock size={28} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">No availability slots yet</h3>
                <p className="mt-2 text-sm text-gray-500">Start by adding your first consultation window or a leave block to organize your schedule.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
