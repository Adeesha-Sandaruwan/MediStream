// Appointments.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AppointmentTable from '../components/appointmentTable';
import AppointmentForm from '../components/appointmentForm';
import image from '../assets/land.png';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_APPOINTMENT_API_URL || 'http://localhost:8086/api/v1/appointments';

const Appointments = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(Boolean(location.state?.openCreateForm));
  const [editingAppointment, setEditingAppointment] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [patientIdFilter, setPatientIdFilter] = useState('');
  const [doctorIdFilter, setDoctorIdFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Fetch all appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_BASE_URL);
      setAppointments(response.data);
      setFilteredAppointments(response.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to load appointments. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...appointments];
    
    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }
    
    // Filter by patient ID
    if (patientIdFilter) {
      filtered = filtered.filter(apt => apt.patientId === parseInt(patientIdFilter));
    }
    
    // Filter by doctor ID
    if (doctorIdFilter) {
      filtered = filtered.filter(apt => apt.doctorId === parseInt(doctorIdFilter));
    }
    
    // Filter by date range
    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= start && aptDate <= end;
      });
    }
    
    setFilteredAppointments(filtered);
  }, [appointments, statusFilter, patientIdFilter, doctorIdFilter, dateRange]);

  // Fetch appointments on component mount
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (!location.state?.openCreateForm) {
      return;
    }

    setShowForm(true);
    setEditingAppointment({
      patientId: location.state?.patientId || '',
      doctorId: location.state?.doctorId || '',
      doctorAvailability: location.state?.doctorAvailability || [],
      appointmentDate: '',
      durationMinutes: '30',
      reason: '',
      notes: ''
    });
  }, [location.state]);

  const handleRefresh = () => {
    fetchAppointments();
  };

  const handleCreateClick = () => {
    setEditingAppointment(null);
    setShowForm(true);
  };

  const handleEditClick = (appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAppointment(null);
  };

  const handleFormSave = () => {
    handleFormClose();

    if (location.state?.openCreateForm) {
      navigate('/patient-appointments', { replace: true });
      return;
    }

    fetchAppointments();
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handlePatientIdFilterChange = (e) => {
    setPatientIdFilter(e.target.value);
  };

  const handleDoctorIdFilterChange = (e) => {
    setDoctorIdFilter(e.target.value);
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPatientIdFilter('');
    setDoctorIdFilter('');
    setDateRange({ startDate: '', endDate: '' });
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading appointments...</div>
      </div>
    );
  }

  return (
   
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
        <button
          onClick={handleCreateClick}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          + Create Appointment
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button
            onClick={fetchAppointments}
            className="ml-4 text-red-700 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient ID
            </label>
            <input
              type="number"
              value={patientIdFilter}
              onChange={handlePatientIdFilterChange}
              placeholder="Filter by patient ID"
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Doctor ID
            </label>
            <input
              type="number"
              value={doctorIdFilter}
              onChange={handleDoctorIdFilterChange}
              placeholder="Filter by doctor ID"
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="datetime-local"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateRangeChange}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="datetime-local"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateRangeChange}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg">
          <div className="text-sm text-blue-600">Total</div>
          <div className="text-2xl font-bold text-blue-900">{appointments.length}</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <div className="text-sm text-yellow-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-900">
            {appointments.filter(a => a.status === 'PENDING').length}
          </div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <div className="text-sm text-green-600">Approved</div>
          <div className="text-2xl font-bold text-green-900">
            {appointments.filter(a => a.status === 'APPROVED').length}
          </div>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <div className="text-sm text-red-600">Rejected</div>
          <div className="text-2xl font-bold text-red-900">
            {appointments.filter(a => a.status === 'REJECTED').length}
          </div>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Cancelled</div>
          <div className="text-2xl font-bold text-gray-900">
            {appointments.filter(a => a.status === 'CANCELLED').length}
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <p className="text-sm text-gray-600">
            Showing {filteredAppointments.length} of {appointments.length} appointments
          </p>
        </div>
        <AppointmentTable
          appointments={filteredAppointments}
          onEdit={handleEditClick}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Appointment Form Modal */}
      {showForm && (
        <AppointmentForm
          appointment={editingAppointment}
          onSave={handleFormSave}
          onCancel={handleFormClose}
        />
      )}
    </div>
  );
};

export default Appointments;