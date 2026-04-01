const API_BASE = import.meta.env.VITE_DOCTOR_API_URL || 'http://localhost:8084/api/doctors';

const buildHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const parseError = async (response, fallback) => {
  try {
    const data = await response.json();
    return data.message || fallback;
  } catch {
    return fallback;
  }
};

export const getDoctorProfile = async (token) => {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'GET',
    headers: buildHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load doctor profile'));
  return response.json();
};

export const updateDoctorProfile = async (token, payload) => {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update doctor profile'));
  return response.json();
};

export const getMyAvailability = async (token) => {
  const response = await fetch(`${API_BASE}/availability`, {
    method: 'GET',
    headers: buildHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch availability'));
  return response.json();
};

export const createAvailabilitySlot = async (token, payload) => {
  const response = await fetch(`${API_BASE}/availability`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create availability slot'));
  return response.json();
};

export const updateAvailabilitySlot = async (token, slotId, payload) => {
  const response = await fetch(`${API_BASE}/availability/${slotId}`, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update availability slot'));
  return response.json();
};

export const deleteAvailabilitySlot = async (token, slotId) => {
  const response = await fetch(`${API_BASE}/availability/${slotId}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete availability slot'));
  return response.text();
};

export const getDoctorAppointments = async (token) => {
  const response = await fetch(`${API_BASE}/appointments`, {
    method: 'GET',
    headers: buildHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch appointment requests'));
  return response.json();
};

export const decideAppointment = async (token, appointmentId, payload) => {
  const response = await fetch(`${API_BASE}/appointments/${appointmentId}/decision`, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update appointment decision'));
  return response.json();
};

export const getMyPrescriptions = async (token) => {
  const response = await fetch(`${API_BASE}/prescriptions/mine`, {
    method: 'GET',
    headers: buildHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to fetch prescriptions'));
  return response.json();
};

export const issuePrescription = async (token, payload) => {
  const response = await fetch(`${API_BASE}/prescriptions`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to issue prescription'));
  return response.json();
};
