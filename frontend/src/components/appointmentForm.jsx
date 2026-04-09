// AppointmentForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_APPOINTMENT_API_URL || 'http://localhost:8086/api/v1/appointments';
const DAY_INDEX = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const pad2 = (value) => String(value).padStart(2, '0');

const normalizeTime = (value) => {
  if (!value) return null;
  return value.slice(0, 5);
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60) + m;
};

const dateKey = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const toUpper = (value) => (value || '').toString().toUpperCase();
const DAY_NAME = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const slotIsBookable = (slot) => {
  const slotType = toUpper(slot?.slotType || 'CONSULTATION');
  return slot?.active !== false && slotType !== 'LEAVE';
};

const slotAppliesToDate = (slot, date) => {
  if (!slotIsBookable(slot)) return false;

  if (slot?.specificDate) {
    return slot.specificDate === dateKey(date);
  }

  return DAY_INDEX[toUpper(slot?.dayOfWeek)] === date.getDay();
};

const getNextOccurrenceIso = (dayOfWeek, startTime) => {
  const dayIndex = DAY_INDEX[toUpper(dayOfWeek)];
  if (dayIndex === undefined) return null;

  const start = normalizeTime(startTime);
  if (!start) return null;

  const [h, m] = start.split(':').map(Number);
  const now = new Date();

  for (let i = 0; i <= 7; i += 1) {
    const candidate = new Date();
    candidate.setHours(h, m, 0, 0);
    candidate.setDate(candidate.getDate() + i);

    if (candidate.getDay() !== dayIndex) continue;
    if (candidate <= now) continue;

    return `${dateKey(candidate)}T${start}`;
  }

  return null;
};

const buildSlotOptions = (slots) => {
  const now = new Date();

  return slots
    .map((slot, index) => {
      const start = normalizeTime(slot.startTime);
      const end = normalizeTime(slot.endTime);
      if (!start || !end) return null;

      let appointmentDate = null;
      let dayLabel = toUpper(slot.dayOfWeek) || '';

      if (slot.specificDate) {
        const candidate = new Date(`${slot.specificDate}T${start}`);
        if (Number.isNaN(candidate.getTime()) || candidate <= now) return null;
        appointmentDate = `${slot.specificDate}T${start}`;
        dayLabel = candidate.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
      } else {
        appointmentDate = getNextOccurrenceIso(slot.dayOfWeek, start);
      }

      if (!appointmentDate) return null;

      return {
        value: `${slot.id || index}|${appointmentDate}`,
        appointmentDate,
        label: `${dayLabel} ${start} - ${end}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
};

const fitsDoctorAvailability = (slots, isoDateTime, durationMinutes) => {
  if (!slots.length || !isoDateTime) return true;
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return false;

  const startMin = (date.getHours() * 60) + date.getMinutes();
  const endMin = startMin + (Number(durationMinutes) || 30);

  return slots.some((slot) => {
    if (!slotAppliesToDate(slot, date)) return false;

    const start = normalizeTime(slot.startTime);
    const end = normalizeTime(slot.endTime);
    if (!start || !end) return false;

    const slotStartMin = toMinutes(start);
    const slotEndMin = toMinutes(end);
    return startMin >= slotStartMin && endMin <= slotEndMin;
  });
};

const AppointmentForm = ({ appointment, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    durationMinutes: '',
    reason: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  const doctorAvailability = (appointment?.doctorAvailability || []).filter(slotIsBookable);
  const isConstrainedBooking = Boolean(!appointment?.id && doctorAvailability.length > 0);
  const availableSlots = isConstrainedBooking ? buildSlotOptions(doctorAvailability) : [];

  useEffect(() => {
    if (appointment) {
      // Format date for datetime-local input
      const formattedDate = appointment.appointmentDate 
        ? new Date(appointment.appointmentDate).toISOString().slice(0, 16)
        : '';
      
      setFormData({
        patientId: appointment.patientId || '',
        doctorId: appointment.doctorId || '',
        appointmentDate: formattedDate,
        durationMinutes: appointment.durationMinutes || '30',
        reason: appointment.reason || '',
        notes: appointment.notes || ''
      });
    }
  }, [appointment]);

  useEffect(() => {
    if (!isConstrainedBooking) return;
    if (!selectedSlot && availableSlots.length > 0) {
      setSelectedSlot(availableSlots[0].value);
    }
  }, [availableSlots, isConstrainedBooking, selectedSlot]);

  useEffect(() => {
    if (!isConstrainedBooking) return;
    if (!selectedSlot) return;

    const option = availableSlots.find((slot) => slot.value === selectedSlot);
    if (!option) {
      if (availableSlots.length > 0) {
        setSelectedSlot(availableSlots[0].value);
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      appointmentDate: option.appointmentDate,
    }));
  }, [availableSlots, isConstrainedBooking, selectedSlot]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.patientId) {
      newErrors.patientId = 'Patient ID is required';
    }
    if (!formData.doctorId) {
      newErrors.doctorId = 'Doctor ID is required';
    }
    if (!formData.appointmentDate) {
      newErrors.appointmentDate = 'Appointment date and time is required';
    }
    if (!formData.durationMinutes) {
      newErrors.durationMinutes = 'Duration is required';
    }
    if (!formData.reason || formData.reason.trim() === '') {
      newErrors.reason = 'Reason for appointment is required';
    }
    if (formData.reason && formData.reason.length > 500) {
      newErrors.reason = 'Reason cannot exceed 500 characters';
    }
    if (isConstrainedBooking && !fitsDoctorAvailability(doctorAvailability, formData.appointmentDate, formData.durationMinutes)) {
      newErrors.appointmentDate = 'Please choose a date and time within the doctor availability schedule.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const appointmentData = {
        patientId: parseInt(formData.patientId),
        doctorId: parseInt(formData.doctorId),
        appointmentDate: new Date(formData.appointmentDate).toISOString(),
        durationMinutes: parseInt(formData.durationMinutes),
        reason: formData.reason,
        notes: formData.notes || null
      };
      
      if (appointment && appointment.id) {
        // Update existing appointment
        await axios.put(`${API_BASE_URL}/${appointment.id}`, appointmentData);
      } else {
        // Create new appointment
        await axios.post(API_BASE_URL, appointmentData);
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving appointment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save appointment';
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {appointment ? 'Edit Appointment' : 'Create New Appointment'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Patient ID *
            </label>
            <input
              type="number"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              readOnly={isConstrainedBooking}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.patientId ? 'border-red-500' : ''
              }`}
              placeholder="Enter patient ID"
            />
            {errors.patientId && (
              <p className="text-red-500 text-xs italic">{errors.patientId}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Doctor ID *
            </label>
            <input
              type="number"
              name="doctorId"
              value={formData.doctorId}
              onChange={handleChange}
              readOnly={isConstrainedBooking}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.doctorId ? 'border-red-500' : ''
              }`}
              placeholder="Enter doctor ID"
            />
            {errors.doctorId && (
              <p className="text-red-500 text-xs italic">{errors.doctorId}</p>
            )}
          </div>

          {isConstrainedBooking && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded text-sm text-indigo-700">
              Pick from this doctor's real available slots.
            </div>
          )}
          
          {isConstrainedBooking ? (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Available Slot *
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className={`shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    errors.appointmentDate ? 'border-red-500' : ''
                  }`}
                >
                  {availableSlots.length === 0 && <option value="">No available slots</option>}
                  {availableSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
                {errors.appointmentDate && (
                  <p className="text-red-500 text-xs italic">{errors.appointmentDate}</p>
                )}
              </div>
            </>
          ) : (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Appointment Date & Time *
              </label>
              <input
                type="datetime-local"
                name="appointmentDate"
                value={formData.appointmentDate}
                onChange={handleChange}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                  errors.appointmentDate ? 'border-red-500' : ''
                }`}
              />
              {errors.appointmentDate && (
                <p className="text-red-500 text-xs italic">{errors.appointmentDate}</p>
              )}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Duration (minutes) *
            </label>
            <select
              name="durationMinutes"
              value={formData.durationMinutes}
              onChange={handleChange}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Reason for Appointment *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.reason ? 'border-red-500' : ''
              }`}
              placeholder="Describe the reason for appointment"
            />
            {errors.reason && (
              <p className="text-red-500 text-xs italic">{errors.reason}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              {formData.reason?.length || 0}/500 characters
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="2"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Any additional notes"
            />
          </div>
          
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.submit}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (appointment ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm;