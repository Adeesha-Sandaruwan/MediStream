// AppointmentForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8083/api/v1/appointments'; // Adjust to your backend URL

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
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.doctorId ? 'border-red-500' : ''
              }`}
              placeholder="Enter doctor ID"
            />
            {errors.doctorId && (
              <p className="text-red-500 text-xs italic">{errors.doctorId}</p>
            )}
          </div>
          
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