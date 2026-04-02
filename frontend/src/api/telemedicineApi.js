import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_TELEMEDICINE_API_URL || 'http://localhost:8083/api/telemedicine';

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

/** Normalize snake_case or alternate keys from proxies / Jackson config. */
function normalizeVisitSummary(v) {
  if (v == null || typeof v !== 'object') return v;
  return {
    ...v,
    consultationId: v.consultationId ?? v.consultation_id,
    roomId: v.roomId ?? v.room_id ?? v.publicRoomId ?? v.public_room_id,
    roomUrl: v.roomUrl ?? v.room_url ?? v.shareUrl ?? v.share_url,
    scheduledStartAt: v.scheduledStartAt ?? v.scheduled_start_at,
    scheduledEndAt: v.scheduledEndAt ?? v.scheduled_end_at,
    consultationStatus: v.consultationStatus ?? v.consultation_status,
  };
}

function normalizeIntakeViewDto(row) {
  if (row == null || typeof row !== 'object') return row;
  return {
    ...row,
    id: row.id ?? row.intake_id ?? row.intakeId,
    patientEmail: row.patientEmail ?? row.patient_email,
    doctorEmail: row.doctorEmail ?? row.doctor_email,
    symptoms: row.symptoms ?? row.symptoms,
    additionalDetails: row.additionalDetails ?? row.additional_details,
    urgency: row.urgency ?? row.urgency,
    symptomDuration: row.symptomDuration ?? row.symptom_duration,
    currentMedications: row.currentMedications ?? row.current_medications,
    knownAllergies: row.knownAllergies ?? row.known_allergies,
    status: row.status ?? row.intake_status,
    visit: normalizeVisitSummary(row.visit),
  };
}

export function normalizeSessionPayload(data) {
  if (data == null || typeof data !== 'object') return data;
  const roomUrl = data.roomUrl ?? data.room_url ?? data.shareUrl ?? data.share_url ?? null;
  const roomId = data.roomId ?? data.room_id ?? data.publicRoomId ?? data.public_room_id ?? null;
  return {
    ...data,
    roomUrl,
    roomId,
    scheduledStartAt: data.scheduledStartAt ?? data.scheduled_start_at,
    scheduledEndAt: data.scheduledEndAt ?? data.scheduled_end_at,
    consultationDetails: data.consultationDetails ?? data.consultation_details,
    intakeRequestId: data.intakeRequestId ?? data.intake_request_id,
  };
}

function normalizePendingConsultationDto(d) {
  if (d == null || typeof d !== 'object') return d;
  return {
    ...d,
    id: d.id,
    intakeRequestId: d.intakeRequestId ?? d.intake_request_id,
    roomId: d.roomId ?? d.room_id ?? d.publicRoomId ?? d.public_room_id,
    roomUrl: d.roomUrl ?? d.room_url ?? d.shareUrl ?? d.share_url,
    patientEmail: d.patientEmail ?? d.patient_email,
    doctorEmail: d.doctorEmail ?? d.doctor_email,
    consultationDetails: d.consultationDetails ?? d.consultation_details,
    scheduledStartAt: d.scheduledStartAt ?? d.scheduled_start_at,
    scheduledEndAt: d.scheduledEndAt ?? d.scheduled_end_at,
    status: d.status,
    createdAt: d.createdAt ?? d.created_at,
  };
}

/** @param {string} token @param {object} body PatientIntakeSubmitRequest */
export const submitTelemedicineIntake = async (token, body) => {
  const response = await axios.post(`${API_BASE}/intake`, body, { headers: authHeaders(token) });
  return normalizeIntakeViewDto(response.data);
};

export const getMyTelemedicineIntakes = async (token) => {
  const response = await axios.get(`${API_BASE}/intake/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const arr = response.data;
  return Array.isArray(arr) ? arr.map(normalizeIntakeViewDto) : arr;
};

export const getIncomingIntakeCount = async (token) => {
  const response = await axios.get(`${API_BASE}/intake/incoming/count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.pendingCount;
};

export const getIncomingIntakes = async (token) => {
  const response = await axios.get(`${API_BASE}/intake/incoming`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const arr = response.data;
  return Array.isArray(arr) ? arr.map(normalizeIntakeViewDto) : arr;
};

/**
 * @param {string} token
 * @param {number} intakeId
 * @param {{ scheduledStartAt: string, durationMinutes?: number, doctorMessage?: string }} body
 */
export const scheduleTelemedicineFromIntake = async (token, intakeId, body) => {
  const id = encodeURIComponent(String(intakeId));
  const response = await axios.post(
    `${API_BASE}/intake/${id}/schedule`,
    {
      scheduledStartAt: body.scheduledStartAt,
      durationMinutes: body.durationMinutes,
      doctorMessage: body.doctorMessage?.trim() || undefined,
    },
    { headers: authHeaders(token) }
  );
  return normalizeSessionPayload(response.data);
};

export const getInvitationCount = async (token) => {
  const response = await axios.get(`${API_BASE}/invitations/count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.pendingCount;
};

export const getInvitations = async (token) => {
  const response = await axios.get(`${API_BASE}/invitations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const arr = response.data;
  return Array.isArray(arr) ? arr.map(normalizePendingConsultationDto) : arr;
};

export const getDoctorSchedules = async (token) => {
  const response = await axios.get(`${API_BASE}/doctor/schedules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const arr = response.data;
  return Array.isArray(arr) ? arr.map(normalizePendingConsultationDto) : arr;
};

export const startTelemedicineSession = async (token, roomId) => {
  const response = await axios.post(
    `${API_BASE}/session/${encodeURIComponent(roomId)}/start`,
    {},
    { headers: authHeaders(token) }
  );
  return normalizeSessionPayload(response.data);
};

export const endTelemedicineSession = async (token, roomId) => {
  const response = await axios.post(
    `${API_BASE}/session/${encodeURIComponent(roomId)}/end`,
    {},
    { headers: authHeaders(token) }
  );
  return normalizeSessionPayload(response.data);
};
