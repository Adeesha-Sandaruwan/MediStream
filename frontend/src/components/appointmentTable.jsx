// AppointmentTable.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_APPOINTMENT_API_URL || 'http://localhost:8086/api/v1/appointments';

const AppointmentTable = ({ appointments, onEdit, onRefresh }) => {
  const [loadingAction, setLoadingAction] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const handleApprove = async (appointmentId) => {
    if (window.confirm('Are you sure you want to approve this appointment?')) {
      setLoadingAction(appointmentId);
      try {
        await axios.patch(`${API_BASE_URL}/${appointmentId}/approve`);
        onRefresh();
      } catch (error) {
        console.error('Error approving appointment:', error);
        alert(error.response?.data?.message || 'Failed to approve appointment');
      } finally {
        setLoadingAction(null);
      }
    }
  };

  const handleReject = async (appointmentId) => {
    if (window.confirm('Are you sure you want to reject this appointment?')) {
      setLoadingAction(appointmentId);
      try {
        await axios.patch(`${API_BASE_URL}/${appointmentId}/reject`);
        onRefresh();
      } catch (error) {
        console.error('Error rejecting appointment:', error);
        alert(error.response?.data?.message || 'Failed to reject appointment');
      } finally {
        setLoadingAction(null);
      }
    }
  };

  const handleCancelClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    
    setLoadingAction(selectedAppointment.id);
    try {
      await axios.delete(`${API_BASE_URL}/${selectedAppointment.id}/cancel`, {
        params: { reason: cancelReason }
      });
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedAppointment(null);
      onRefresh();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert(error.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setLoadingAction(null);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString();
  };

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Doctor ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  No appointments found
                </td>
              </tr>
            ) : (
              appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.patientId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.doctorId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDateTime(appointment.appointmentDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.durationMinutes} min
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {appointment.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEdit(appointment)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      
                      {appointment.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(appointment.id)}
                            disabled={loadingAction === appointment.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(appointment.id)}
                            disabled={loadingAction === appointment.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {(appointment.status === 'PENDING' || appointment.status === 'APPROVED') && (
                        <button
                          onClick={() => handleCancelClick(appointment)}
                          disabled={loadingAction === appointment.id}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Appointment</h3>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to cancel this appointment?
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Reason for Cancellation *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows="3"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Please provide a reason for cancellation"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setSelectedAppointment(null);
                }}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
              >
                No, Keep It
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={loadingAction === selectedAppointment?.id}
                className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50"
              >
                Yes, Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentTable;