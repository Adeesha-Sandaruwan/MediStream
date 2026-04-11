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

const BLOCKING_STATUSES = new Set(['PENDING', 'APPROVED', 'COMPLETED']);

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

const minuteKeyFromDateAndTime = (dateStr, hhmm) => `${dateStr}T${hhmm}`;

const normalizeAppointmentMinuteKey = (value) => {
  if (!value) return null;
  const asString = String(value);
  const directMatch = asString.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (directMatch) return directMatch[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
};

const toLocalDateTimeSeconds = (value) => {
  if (!value) return '';

  // Keep already-local values untouched (datetime-local style) and append seconds when needed.
  const direct = String(value).match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?/);
  if (direct) {
    return `${direct[1]}:00`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}:00`;
};

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

const buildDateOptions = (slots, daysAhead = 30) => {
  const options = [];
  const seen = new Set();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysAhead; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const matchingSlots = slots.filter((slot) => slotAppliesToDate(slot, date));
    if (matchingSlots.length === 0) continue;

    const key = dateKey(date);
    if (seen.has(key)) continue;
    seen.add(key);

    options.push({
      value: key,
      label: date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
    });
  }

  return options;
};

const buildTimeOptions = (slots, selectedDate, bookedSlotKeys) => {
  if (!selectedDate) return [];

  const date = new Date(`${selectedDate}T00:00`);
  if (Number.isNaN(date.getTime())) return [];

  const generated = [];
  const seen = new Set();

  slots
    .filter((slot) => slotAppliesToDate(slot, date))
    .forEach((slot) => {
      const start = normalizeTime(slot.startTime);
      const end = normalizeTime(slot.endTime);
      if (!start || !end) return;

      const startMin = toMinutes(start);
      const endMin = toMinutes(end);

      for (let cursor = startMin; cursor + 30 <= endMin; cursor += 30) {
        const slotStart = `${pad2(Math.floor(cursor / 60))}:${pad2(cursor % 60)}`;
        const slotEndMinutes = cursor + 30;
        const slotEnd = `${pad2(Math.floor(slotEndMinutes / 60))}:${pad2(slotEndMinutes % 60)}`;
        const minuteKey = minuteKeyFromDateAndTime(selectedDate, slotStart);

        if (bookedSlotKeys.has(minuteKey) || seen.has(minuteKey)) {
          continue;
        }
        seen.add(minuteKey);

        generated.push({
          value: minuteKey,
          appointmentDate: `${selectedDate}T${slotStart}:00`,
          label: `${slotStart} - ${slotEnd}`,
        });
      }
    })

  return generated.sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
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
  const [isSlotLoading, setIsSlotLoading] = useState(false);
  const [bookedSlotKeys, setBookedSlotKeys] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const doctorAvailability = (appointment?.doctorAvailability || []).filter(slotIsBookable);
  const isConstrainedBooking = Boolean(!appointment?.id && doctorAvailability.length > 0);
  const availableDates = isConstrainedBooking ? buildDateOptions(doctorAvailability) : [];
  const availableTimes = isConstrainedBooking ? buildTimeOptions(doctorAvailability, selectedDate, bookedSlotKeys) : [];
  const selectedDateLabel = availableDates.find((option) => option.value === selectedDate)?.label || '';
  const selectedTimeLabel = availableTimes.find((option) => option.value === selectedTime)?.label || '';

  useEffect(() => {
    if (appointment) {
      // Format date for datetime-local input
      const formattedDate = appointment.appointmentDate
        ? toLocalDateTimeSeconds(appointment.appointmentDate).slice(0, 16)
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
    if (!isConstrainedBooking) {
      setBookedSlotKeys(new Set());
      return;
    }

    const doctorId = Number(formData.doctorId);
    if (!doctorId) {
      setBookedSlotKeys(new Set());
      return;
    }

    let isCancelled = false;

    const loadBookedSlots = async () => {
      setIsSlotLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/doctor/${doctorId}`);
        const slots = new Set(
          (Array.isArray(response.data) ? response.data : [])
            .filter((apt) => BLOCKING_STATUSES.has(toUpper(apt?.status)))
            .map((apt) => normalizeAppointmentMinuteKey(apt?.appointmentDate))
            .filter(Boolean)
        );
        if (!isCancelled) {
          setBookedSlotKeys(slots);
        }
      } catch (error) {
        if (!isCancelled) {
          setBookedSlotKeys(new Set());
        }
      } finally {
        if (!isCancelled) {
          setIsSlotLoading(false);
        }
      }
    };

    loadBookedSlots();

    return () => {
      isCancelled = true;
    };
  }, [formData.doctorId, isConstrainedBooking]);

  useEffect(() => {
    if (!isConstrainedBooking) return;
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0].value);
    }
  }, [availableDates, isConstrainedBooking, selectedDate]);

  useEffect(() => {
    if (!isConstrainedBooking) return;
    if (!selectedDate) return;

    if (availableTimes.length === 0) {
      setSelectedTime('');
      return;
    }

    if (!availableTimes.some((opt) => opt.value === selectedTime)) {
      setSelectedTime(availableTimes[0].value);
    }
  }, [availableTimes, isConstrainedBooking, selectedDate, selectedTime]);

  useEffect(() => {
    if (!isConstrainedBooking) return;
    if (!selectedDate || !selectedTime) return;

    const option = availableTimes.find((time) => time.value === selectedTime);
    if (!option) return;

    setFormData((prev) => ({
      ...prev,
      appointmentDate: option.appointmentDate,
    }));
  }, [availableTimes, isConstrainedBooking, selectedDate, selectedTime]);

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
    if (formData.reason && formData.reason.trim().length < 5) {
      newErrors.reason = 'Reason must be at least 5 characters';
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
        appointmentDate: toLocalDateTimeSeconds(formData.appointmentDate),
        durationMinutes: isConstrainedBooking ? 30 : parseInt(formData.durationMinutes),
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
      const apiMessage = error.response?.data?.message;
      const apiDetails = error.response?.data?.details;
      const errorMessage = apiDetails || apiMessage || 'Failed to save appointment';
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
            {isConstrainedBooking ? 'Book Appointment' : (appointment ? 'Edit Appointment' : 'Create New Appointment')}
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
                  Select a date within the next 30 days and then choose one available 30-minute slot.
            </div>
          )}
          
          {isConstrainedBooking ? (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Appointment Date *
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    errors.appointmentDate ? 'border-red-500' : ''
                  }`}
                >
                  {availableDates.length === 0 && <option value="">No available dates</option>}
                  {availableDates.map((dateOpt) => (
                    <option key={dateOpt.value} value={dateOpt.value}>{dateOpt.label}</option>
                  ))}
                </select>
                {errors.appointmentDate && (
                  <p className="text-red-500 text-xs italic">{errors.appointmentDate}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Appointment Time *
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className={`shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    errors.appointmentDate ? 'border-red-500' : ''
                  }`}
                >
                  {isSlotLoading && <option value="">Loading available slots...</option>}
                  {!isSlotLoading && availableTimes.length === 0 && <option value="">No available times for selected date</option>}
                  {availableTimes.map((timeOpt) => (
                    <option key={timeOpt.value} value={timeOpt.value}>{timeOpt.label}</option>
                  ))}
                </select>
              </div>

              {selectedDateLabel && selectedTimeLabel && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Selected appointment: {selectedDateLabel} at {selectedTimeLabel}
                </div>
              )}
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
          
          {isConstrainedBooking ? (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Duration
              </label>
              <div className="shadow border rounded w-full py-2 px-3 text-gray-700 bg-gray-50">
                30 minutes per slot
              </div>
            </div>
          ) : (
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
                <option value="30">30 minutes</option>
              </select>
            </div>
          )}

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
              {isLoading ? 'Saving...' : (isConstrainedBooking ? 'Book Appointment' : (appointment ? 'Update' : 'Create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm;