import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllDoctors } from '../api/doctorApi';
import {
  submitTelemedicineIntake,
  getMyTelemedicineIntakes,
  getIncomingIntakeCount,
  getIncomingIntakes,
  scheduleTelemedicineFromIntake,
  startTelemedicineSession,
  endTelemedicineSession,
  getInvitationCount,
  getInvitations,
  getDoctorSchedules,
  getDoctorPastMeetings,
} from '../api/telemedicineApi';
import { Bell, Video, Loader2, CalendarClock, Stethoscope, CheckCircle2, Sparkles, History, Clock3 } from 'lucide-react';

const JITSI_BASE_URL = 'https://meet.jit.si';

function getRoomIdFromUrl(input) {
  const raw = (input || '').trim();
  if (!raw) return '';
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) return raw;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
}

function buildRoomUrlFromRoomId(roomId) {
  const rid = (roomId || '').trim();
  if (!rid) return '';
  return `${JITSI_BASE_URL}/${encodeURIComponent(rid)}`;
}

function parseApiError(e, fallback) {
  const status = e?.response?.status;
  const d = e?.response?.data;
  if (d != null) {
    if (typeof d === 'string') return status ? `${status}: ${d}` : d;
    if (d.detail) return status ? `${status}: ${typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)}` : d.detail;
    if (d.message) return status ? `${status}: ${d.message}` : d.message;
    if (d.title) return status ? `${status}: ${d.title}` : d.title;
  }
  if (status) return `${status}: ${e?.response?.statusText ?? fallback}`;
  if (e?.message && typeof e.message === 'string') return e.message;
  return fallback;
}

/** Handles ISO strings, epoch ms numbers, or legacy Jackson array timestamps. */
function normalizeToDate(val) {
  if (val == null) return null;
  if (typeof val === 'number' && !Number.isNaN(val)) return new Date(val);
  if (Array.isArray(val) && val.length >= 3) {
    const [y, m, d, h = 0, min = 0, sec = 0] = val;
    return new Date(y, (m || 1) - 1, d || 1, h, min, sec);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatLocal(iso) {
  const d = normalizeToDate(iso);
  if (!d) return '—';
  try {
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function formatDuration(startAt, endAt) {
  const start = normalizeToDate(startAt);
  const end = normalizeToDate(endAt);
  if (!start || !end) return '—';
  const diffMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  if (diffMin < 60) return `${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function historyStatusClasses(status) {
  if (status === 'ENDED' || status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'LIVE') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

/** Merge nested `visit` with invitations when API omits visit or uses alternate keys. */
function getEffectiveVisit(row, invitationList) {
  const v = row?.visit;
  const directUrl = v?.roomUrl || v?.room_url;
  if (directUrl) {
    return {
      ...v,
      roomUrl: directUrl,
      roomId: v.roomId || v.room_id,
      scheduledStartAt: v.scheduledStartAt ?? v.scheduled_start_at,
      scheduledEndAt: v.scheduledEndAt ?? v.scheduled_end_at,
      consultationStatus: v.consultationStatus ?? v.consultation_status,
    };
  }
  if (row?.status !== 'VISIT_BOOKED') return v || null;
  if (!invitationList?.length) return v || null;
  const byIntake = invitationList.find(
    (i) => i.intakeRequestId != null && Number(i.intakeRequestId) === Number(row.id)
  );
  const inv =
    byIntake ||
    invitationList.find((i) => i.doctorEmail?.toLowerCase() === row.doctorEmail?.toLowerCase());
  if (!inv) return v || null;
  const roomUrl = inv.roomUrl || inv.room_url;
  if (!roomUrl) return v || null;
  return {
    consultationId: inv.id,
    roomId: inv.roomId || inv.room_id,
    roomUrl,
    scheduledStartAt: inv.scheduledStartAt ?? inv.scheduled_start_at,
    scheduledEndAt: inv.scheduledEndAt ?? inv.scheduled_end_at,
    consultationStatus: inv.status,
  };
}

function isWithinMeetingWindow(inv, nowMs = Date.now()) {
  const s = normalizeToDate(inv?.scheduledStartAt);
  const e = normalizeToDate(inv?.scheduledEndAt);
  if (!s || !e) return false;
  return nowMs >= s.getTime() && nowMs <= e.getTime();
}

function isBeforeWindow(inv, nowMs = Date.now()) {
  const s = normalizeToDate(inv?.scheduledStartAt);
  if (!s) return false;
  return nowMs < s.getTime();
}

/** API may return id as string or number — always compare/coerce. */
function intakeIdNum(id) {
  if (id == null || id === '') return NaN;
  const n = Number(id);
  return Number.isFinite(n) ? n : NaN;
}

/** Stable string key for an intake row (avoids 5 !== "5" and Number(null) === 0 bugs). */
function intakeRowKey(req) {
  const raw = req?.id ?? req?.intake_id ?? req?.intakeId;
  if (raw == null || raw === '') return '';
  return String(raw);
}

/** `datetime-local` value in local timezone (YYYY-MM-DDTHH:mm). */
function toDatetimeLocalValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Default meeting time: 1 hour from now (always in the future for scheduling). */
function defaultMeetingDatetimeLocal() {
  return toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000));
}

export default function Telemedicine() {
  const { token, role, email } = useAuth();

  const [session, setSession] = useState(null);
  const [joinInput, setJoinInput] = useState('');
  const [doctorRoomId, setDoctorRoomId] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [urgency, setUrgency] = useState('ROUTINE');
  const [symptomDuration, setSymptomDuration] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [knownAllergies, setKnownAllergies] = useState('');
  const [myIntakes, setMyIntakes] = useState([]);

  const [incomingCount, setIncomingCount] = useState(0);
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [incomingList, setIncomingList] = useState([]);
  const [scheduleForId, setScheduleForId] = useState(null);
  const [schStart, setSchStart] = useState('');
  const [schDur, setSchDur] = useState(60);
  const [schMsg, setSchMsg] = useState('');
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [schedulingError, setSchedulingError] = useState('');

  const [invitationCount, setInvitationCount] = useState(0);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [invitationList, setInvitationList] = useState([]);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [doctorPastMeetings, setDoctorPastMeetings] = useState([]);
  const [doctorPastLoading, setDoctorPastLoading] = useState(false);
  const [doctorPastError, setDoctorPastError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ended, setEnded] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [patientSuccess, setPatientSuccess] = useState('');
  const [doctorSuccess, setDoctorSuccess] = useState(null);

  const pendingReviewCount = useMemo(
    () => myIntakes.filter((i) => i.status === 'PENDING_REVIEW').length,
    [myIntakes]
  );

  const bookedReadyCount = useMemo(
    () =>
      myIntakes.filter((i) => {
        if (i.status !== 'VISIT_BOOKED') return false;
        const v = getEffectiveVisit(i, invitationList);
        return v?.roomUrl;
      }).length,
    [myIntakes, invitationList]
  );

  const embedUrl = useMemo(() => {
    if (session?.roomUrl) return session.roomUrl;
    const rid = getRoomIdFromUrl(joinInput);
    return buildRoomUrlFromRoomId(rid);
  }, [session, joinInput]);

  const currentRoomId = useMemo(() => {
    if (session?.roomId) return session.roomId;
    return getRoomIdFromUrl(joinInput);
  }, [session, joinInput]);

  const doctorPastMeetingsSorted = useMemo(() => {
    return [...doctorPastMeetings].sort((a, b) => {
      const ta =
        normalizeToDate(a.endedAt)?.getTime() ??
        normalizeToDate(a.scheduledEndAt)?.getTime() ??
        normalizeToDate(a.startedAt)?.getTime() ??
        0;
      const tb =
        normalizeToDate(b.endedAt)?.getTime() ??
        normalizeToDate(b.scheduledEndAt)?.getTime() ??
        normalizeToDate(b.startedAt)?.getTime() ??
        0;
      return tb - ta;
    });
  }, [doctorPastMeetings]);

  const loadMyIntakes = useCallback(async () => {
    if (role !== 'PATIENT' || !token) return;
    try {
      const list = await getMyTelemedicineIntakes(token);
      setMyIntakes(list || []);
    } catch (e) {
      setError(parseApiError(e, 'Failed to load your requests'));
    }
  }, [role, token]);

  useEffect(() => {
    if (role !== 'PATIENT' || !token) return;
    let c = false;
    (async () => {
      setDoctorsLoading(true);
      try {
        const list = await getAllDoctors(token);
        if (!c) setDoctors(list || []);
      } catch {
        if (!c) setError('Could not load doctors. Ensure doctor service is running.');
      } finally {
        if (!c) setDoctorsLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [role, token]);

  const refreshInvitations = useCallback(async () => {
    if (role !== 'PATIENT' || !token) return;
    try {
      const n = await getInvitationCount(token);
      setInvitationCount(n);
    } catch {
      /* ignore */
    }
  }, [role, token]);

  const loadInvitationList = useCallback(async () => {
    if (role !== 'PATIENT' || !token) return;
    try {
      const list = await getInvitations(token);
      setInvitationList(list || []);
    } catch (e) {
      setError(parseApiError(e, 'Failed to load visits'));
    }
  }, [role, token]);

  useEffect(() => {
    refreshInvitations();
    const id = setInterval(refreshInvitations, 6000);
    return () => clearInterval(id);
  }, [refreshInvitations]);

  /* Patient: keep intakes + visits fresh so link & times appear without refresh. */
  useEffect(() => {
    if (role !== 'PATIENT' || !token) return;
    const tick = async () => {
      try {
        await Promise.all([loadMyIntakes(), loadInvitationList(), refreshInvitations()]);
      } catch {
        /* individual handlers may set error */
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [role, token, loadMyIntakes, loadInvitationList, refreshInvitations]);

  const refreshIncoming = useCallback(async () => {
    if (role !== 'DOCTOR' || !token) return;
    try {
      const n = await getIncomingIntakeCount(token);
      setIncomingCount(n);
    } catch {
      /* ignore */
    }
  }, [role, token]);

  useEffect(() => {
    refreshIncoming();
    const id = setInterval(refreshIncoming, 6000);
    return () => clearInterval(id);
  }, [refreshIncoming]);

  const loadIncomingList = useCallback(async () => {
    if (role !== 'DOCTOR' || !token) return;
    try {
      const list = await getIncomingIntakes(token);
      setIncomingList(list || []);
    } catch (e) {
      setError(parseApiError(e, 'Failed to load patient requests'));
    }
  }, [role, token]);

  const loadDoctorSchedules = useCallback(async () => {
    if (role !== 'DOCTOR' || !token) return;
    try {
      const list = await getDoctorSchedules(token);
      setDoctorSchedules(list || []);
    } catch (e) {
      setError(parseApiError(e, 'Failed to load schedules'));
    }
  }, [role, token]);

  const loadDoctorPastMeetings = useCallback(async () => {
    if (role !== 'DOCTOR' || !token) return;
    setDoctorPastError('');
    setDoctorPastLoading(true);
    try {
      const list = await getDoctorPastMeetings(token);
      setDoctorPastMeetings(list || []);
    } catch (e) {
      setDoctorPastError(parseApiError(e, 'Failed to load past meetings'));
    } finally {
      setDoctorPastLoading(false);
    }
  }, [role, token]);

  useEffect(() => {
    if (incomingOpen && role === 'DOCTOR') {
      loadIncomingList();
      const id = setInterval(loadIncomingList, 8000);
      return () => clearInterval(id);
    }
  }, [incomingOpen, role, loadIncomingList]);

  useEffect(() => {
    if (role === 'DOCTOR' && token) {
      loadDoctorSchedules();
      loadDoctorPastMeetings();
    }
  }, [role, token, loadDoctorSchedules, loadDoctorPastMeetings]);

  useEffect(() => {
    if (role !== 'DOCTOR' || !token) return;
    const id = setInterval(() => {
      loadDoctorSchedules();
      loadDoctorPastMeetings();
    }, 15000);
    return () => clearInterval(id);
  }, [role, token, loadDoctorSchedules, loadDoctorPastMeetings]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!doctorSuccess) return;
    const t = setTimeout(() => setDoctorSuccess(null), 20000);
    return () => clearTimeout(t);
  }, [doctorSuccess]);

  useEffect(() => {
    if (!patientSuccess) return;
    const t = setTimeout(() => setPatientSuccess(''), 8000);
    return () => clearTimeout(t);
  }, [patientSuccess]);

  const handleSubmitIntake = async (e) => {
    e.preventDefault();
    setError('');
    setPatientSuccess('');
    setEnded(false);
    if (!selectedDoctor?.email) {
      setError('Select a doctor.');
      return;
    }
    const sym = symptoms.trim();
    if (!sym) {
      setError('Describe your main symptoms or concern.');
      return;
    }
    setLoading(true);
    try {
      await submitTelemedicineIntake(token, {
        doctorEmail: selectedDoctor.email,
        symptoms: sym,
        additionalDetails: additionalDetails.trim() || undefined,
        urgency,
        symptomDuration: symptomDuration.trim() || undefined,
        currentMedications: currentMedications.trim() || undefined,
        knownAllergies: knownAllergies.trim() || undefined,
      });
      setSymptoms('');
      setAdditionalDetails('');
      setSymptomDuration('');
      setCurrentMedications('');
      setKnownAllergies('');
      setUrgency('ROUTINE');
      await loadMyIntakes();
      setPatientSuccess('Request sent. Your doctor will review it and send you a video link with a time.');
    } catch (err) {
      setError(parseApiError(err, 'Failed to submit request'));
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleIntake = async (intakeId, patientEmailForMsg) => {
    setSchedulingError('');
    setError('');
    const idNum = intakeIdNum(intakeId);
    if (!Number.isFinite(idNum)) {
      const msg = 'Invalid request id. Refresh the page and try again.';
      setSchedulingError(msg);
      setError(msg);
      return;
    }
    if (!schStart?.trim()) {
      const msg = 'Choose a meeting start date and time.';
      setSchedulingError(msg);
      setError(msg);
      return;
    }
    const startDate = new Date(schStart);
    if (Number.isNaN(startDate.getTime())) {
      const msg = 'Invalid date/time.';
      setSchedulingError(msg);
      setError(msg);
      return;
    }
    /* Allow small clock drift: must be after "now" minus 2 minutes */
    if (startDate.getTime() < Date.now() - 120_000) {
      const msg = 'Meeting must start in the future. Pick a later time.';
      setSchedulingError(msg);
      setError(msg);
      return;
    }

    const payload = {
      scheduledStartAt: startDate.toISOString(),
      durationMinutes: Number(schDur) || 60,
      doctorMessage: schMsg,
    };

    setSchedulingLoading(true);
    setDoctorSuccess(null);
    try {
      console.debug('Scheduling telemedicine intake', intakeId, payload);
      const data = await scheduleTelemedicineFromIntake(token, idNum, payload);
      if (!data?.roomUrl && !data?.roomId) {
        throw new Error('Server did not return a room. Check telemedicine service logs.');
      }
      setSession(data);
      setJoinInput(data.roomUrl || data.roomId);
      setDoctorRoomId(data.roomId || getRoomIdFromUrl(data.roomUrl));
      setScheduleForId(null);
      setSchStart('');
      setSchMsg('');
      await refreshIncoming();
      await loadIncomingList();
      await loadDoctorSchedules();
      const startLabel = formatLocal(data.scheduledStartAt);
      const endLabel = formatLocal(data.scheduledEndAt);
      setDoctorSuccess({
        patientEmail: patientEmailForMsg,
        roomUrl: data.roomUrl ?? data.shareUrl ?? buildRoomUrlFromRoomId(data.roomId ?? data.publicRoomId),
        roomId: data.roomId ?? data.publicRoomId ?? getRoomIdFromUrl(data.roomUrl),
        startLabel,
        endLabel,
      });
      window.alert(
        `Visit scheduled successfully.\n\nPatient: ${patientEmailForMsg}\nTime: ${startLabel} – ${endLabel}\nThe patient will see this on their Telemedicine page within a few seconds.`
      );
    } catch (err) {
      console.error('Telemedicine scheduling error', err);
      const msg = parseApiError(err, 'Scheduling failed');
      setSchedulingError(msg);
      setError(msg);
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleDoctorStartManual = async () => {
    setError('');
    setLoading(true);
    try {
      const rid = getRoomIdFromUrl(doctorRoomId || joinInput);
      if (!rid) {
        setError('Enter a valid Room ID or URL');
        return;
      }
      const data = await startTelemedicineSession(token, rid);
      setSession(data);
      setJoinInput(data.roomUrl || buildRoomUrlFromRoomId(rid));
      setDoctorRoomId(data.roomId || rid);
      await loadDoctorSchedules();
    } catch (err) {
      setError(parseApiError(err, 'Failed to start session'));
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorJoinSchedule = async (schedule) => {
    setError('');
    setLoading(true);
    try {
      const rid = getRoomIdFromUrl(schedule.roomUrl || schedule.roomId || schedule.publicRoomId);
      if (!rid) {
        setError('Scheduled session has no room URL');
        return;
      }
      const data = await startTelemedicineSession(token, rid);
      setSession(data);
      setJoinInput(data.roomUrl || schedule.roomUrl || buildRoomUrlFromRoomId(rid));
      setDoctorRoomId(data.roomId || rid);
      await loadDoctorSchedules();
    } catch (err) {
      setError(parseApiError(err, 'Cannot join scheduled session'));
    } finally {
      setLoading(false);
    }
  };

  const handlePatientStartFromInvitation = async (inv) => {
    setError('');
    setLoading(true);
    try {
      const data = await startTelemedicineSession(token, inv.roomId);
      setSession(data);
      setJoinInput(data.roomUrl || inv.roomUrl || inv.roomId);
      await refreshInvitations();
      await loadInvitationList();
      await loadMyIntakes();
    } catch (err) {
      setError(parseApiError(err, 'Cannot join yet — check scheduled time'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    setError('');
    setLoading(true);
    try {
      const rid = currentRoomId;
      if (!rid) {
        setError('No active room');
        return;
      }
      await endTelemedicineSession(token, rid);
      setEnded(true);
      if (role === 'DOCTOR') {
        await loadDoctorSchedules();
        await loadDoctorPastMeetings();
      }
      if (role === 'PATIENT') {
        await refreshInvitations();
        await loadInvitationList();
        await loadMyIntakes();
      }
    } catch (err) {
      setError(parseApiError(err, 'Failed to end session'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Telemedicine</h1>
        <p className="mt-2 text-gray-600">Please log in.</p>
      </div>
    );
  }

  if (role !== 'PATIENT' && role !== 'DOCTOR') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Telemedicine</h1>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          Available for patient and doctor accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-8 w-8 text-emerald-600" />
            Telemedicine
          </h1>
          <p className="mt-2 text-gray-600">
            {role === 'DOCTOR'
              ? 'Review patient requests, then set the visit time and video link.'
              : 'Send a request to your doctor; once they schedule, your visit appears below and in Video visits.'}
          </p>
          {email && (
            <p className="mt-1 text-sm text-gray-500">
              Logged in as <span className="font-medium text-gray-800">{email}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {role === 'PATIENT' && pendingReviewCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
              {pendingReviewCount} awaiting doctor
            </span>
          )}

          {role === 'DOCTOR' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIncomingOpen((o) => !o);
                  if (!incomingOpen) loadIncomingList();
                }}
                className="relative flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm hover:bg-gray-50"
              >
                <Bell className="h-5 w-5 text-gray-700" />
                <span className="font-medium text-gray-900">Patient requests</span>
                {incomingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                    {incomingCount > 99 ? '99+' : incomingCount}
                  </span>
                )}
              </button>

              {incomingOpen && (
                <div className="absolute right-0 z-[200] mt-2 w-[min(100vw-2rem,36rem)] max-h-[75vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="sticky top-0 border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">New consultation requests</h3>
                    <p className="text-xs text-gray-500">Patient intake — set time to create the video link</p>
                  </div>
                  {!incomingList.length ? (
                    <p className="p-6 text-sm text-gray-600">No pending requests.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {incomingList.map((req, index) => {
                        const rowKey = intakeRowKey(req);
                        const iid = intakeIdNum(rowKey || req?.id);
                        const isSchedulingThis =
                          scheduleForId != null && rowKey !== '' && scheduleForId === rowKey;
                        return (
                        <li
                          key={rowKey || `incoming-${index}`}
                          id={rowKey ? `schedule-intake-${rowKey}` : undefined}
                          className="p-4 text-sm"
                        >
                          <div className="font-medium text-gray-900">Patient: {req.patientEmail}</div>
                          <div className="mt-2">
                            <span className="font-medium text-gray-800">Symptoms: </span>
                            <span className="text-gray-700">{req.symptoms}</span>
                          </div>
                          {req.additionalDetails && (
                            <div className="mt-2 text-gray-700">
                              <span className="font-medium">More info: </span>
                              {req.additionalDetails}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="rounded bg-gray-100 px-2 py-0.5">
                              Urgency: {req.urgency || 'ROUTINE'}
                            </span>
                            {req.symptomDuration && (
                              <span className="rounded bg-gray-100 px-2 py-0.5">
                                Duration: {req.symptomDuration}
                              </span>
                            )}
                          </div>
                          {req.currentMedications && (
                            <div className="mt-2 text-gray-700">
                              <span className="font-medium">Medications: </span>
                              {req.currentMedications}
                            </div>
                          )}
                          {req.knownAllergies && (
                            <div className="mt-2 text-gray-700">
                              <span className="font-medium">Allergies: </span>
                              {req.knownAllergies}
                            </div>
                          )}
                          <div className="mt-3">
                            {isSchedulingThis ? (
                              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
                                <label className="block text-xs font-medium text-gray-700">
                                  Meeting start (your local time)
                                </label>
                                <input
                                  type="datetime-local"
                                  value={schStart}
                                  onChange={(e) => {
                                    setSchStart(e.target.value);
                                    setSchedulingError('');
                                  }}
                                  className="w-full rounded border border-gray-300 p-2 text-sm"
                                />
                                <p className="text-xs text-gray-500">
                                  Defaults to 1 hour from when you opened this — change if needed.
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    min={15}
                                    max={480}
                                    value={schDur}
                                    onChange={(e) => setSchDur(Number(e.target.value))}
                                    className="w-24 rounded border border-gray-300 p-2 text-sm"
                                  />
                                  <span className="self-center text-xs text-gray-600">minutes</span>
                                </div>
                                <textarea
                                  value={schMsg}
                                  onChange={(e) => setSchMsg(e.target.value)}
                                  placeholder="Optional message to patient (prep, what to bring, etc.)"
                                  rows={2}
                                  className="w-full rounded border border-gray-300 p-2 text-xs"
                                />
                                {schedulingError && (
                                  <p className="text-xs text-red-600 font-medium" role="alert">
                                    {schedulingError}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2 items-center">
                                  <button
                                    type="button"
                                    disabled={schedulingLoading}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleScheduleIntake(
                                        req.id ?? req.intake_id ?? req.intakeId,
                                        req.patientEmail
                                      );
                                    }}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
                                  >
                                    {schedulingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {schedulingLoading ? 'Creating link…' : 'Create link & schedule'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={schedulingLoading}
                                    onClick={() => {
                                      setScheduleForId(null);
                                      setSchedulingError('');
                                    }}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSchedulingError('');
                                  if (!rowKey || !Number.isFinite(iid)) {
                                    setError(
                                      'Invalid request id from server. Refresh the page or check the telemedicine API.'
                                    );
                                    return;
                                  }
                                  setScheduleForId(rowKey);
                                  setSchStart(defaultMeetingDatetimeLocal());
                                  setSchDur(60);
                                  setSchMsg('');
                                  window.setTimeout(() => {
                                    document
                                      .getElementById(`schedule-intake-${rowKey}`)
                                      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                  }, 0);
                                }}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white text-sm hover:bg-indigo-700"
                              >
                                Set time & video link
                              </button>
                            )}
                          </div>
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {role === 'PATIENT' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setInvitationsOpen((o) => !o);
                  if (!invitationsOpen) loadInvitationList();
                }}
                className="relative flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm hover:bg-gray-50"
              >
                <CalendarClock className="h-5 w-5 text-gray-700" />
                <span className="font-medium text-gray-900">Video visits</span>
                {invitationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-bold text-white">
                    {invitationCount > 99 ? '99+' : invitationCount}
                  </span>
                )}
              </button>

              {invitationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,32rem)] max-h-[72vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="sticky top-0 border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">Scheduled video visits</h3>
                    <p className="text-xs text-gray-500">Join only during the time window</p>
                  </div>
                  {!invitationList.length ? (
                    <p className="p-6 text-sm text-gray-600">No scheduled visits yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {invitationList.map((inv) => {
                        const canStart = isWithinMeetingWindow(inv, nowTick);
                        const before = isBeforeWindow(inv, nowTick);
                        return (
                          <li key={inv.id} className="p-4 text-sm">
                            <div className="font-medium text-gray-900">Doctor: {inv.doctorEmail}</div>
                            <div className="mt-2 whitespace-pre-wrap text-gray-700 text-xs max-h-32 overflow-y-auto border border-gray-100 rounded p-2 bg-gray-50">
                              {inv.consultationDetails || '—'}
                            </div>
                            <div className="mt-2 flex items-start gap-2 text-gray-600">
                              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <div>Opens: {formatLocal(inv.scheduledStartAt)}</div>
                                <div>Closes: {formatLocal(inv.scheduledEndAt)}</div>
                              </div>
                            </div>
                            <div className="mt-2 font-mono text-xs text-gray-500 break-all">Room: {inv.roomId}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={loading || !canStart}
                                onClick={() => handlePatientStartFromInvitation(inv)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {before ? 'Opens at scheduled time' : canStart ? 'Join video' : 'Window ended'}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(inv.roomUrl)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                              >
                                Copy link
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {ended && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-700">
            Session ended.
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {patientSuccess && role === 'PATIENT' && (
        <div
          className="mt-6 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 text-emerald-900 shadow-sm flex gap-3 items-start"
          role="status"
        >
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Request sent</p>
            <p className="text-sm mt-1 text-emerald-800/90">{patientSuccess}</p>
          </div>
        </div>
      )}

      {doctorSuccess && role === 'DOCTOR' && (
        <div
          className="mt-6 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-indigo-50 px-5 py-5 text-gray-900 shadow-lg ring-1 ring-emerald-100"
          role="status"
        >
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-lg">
            <Sparkles className="h-6 w-6" />
            Visit created — patient can see link & time
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Patient: <span className="font-medium text-gray-900">{doctorSuccess.patientEmail}</span>
          </p>
          <p className="mt-1 text-sm">
            <span className="text-gray-600">Window: </span>
            <span className="font-medium">{doctorSuccess.startLabel}</span>
            <span className="text-gray-500"> → </span>
            <span className="font-medium">{doctorSuccess.endLabel}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              onClick={() => copyToClipboard(doctorSuccess.roomUrl)}
            >
              Copy video link
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => copyToClipboard(doctorSuccess.roomId)}
            >
              Copy room ID
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500 break-all">{doctorSuccess.roomUrl}</p>
        </div>
      )}

      {role === 'PATIENT' && bookedReadyCount > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 p-5 shadow-md">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-lg">
            <CheckCircle2 className="h-7 w-7" />
            Your doctor scheduled a video visit
          </div>
          <p className="mt-2 text-sm text-emerald-900/80">
            Open <strong>Video visits</strong> (top right) or scroll to <strong>Your telemedicine requests</strong> for
            the link and times. Join only during the scheduled window.
          </p>
        </div>
      )}

      {role === 'PATIENT' && (
        <>
          <div className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Request a telemedicine visit
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose your doctor and share symptoms and health details. Your doctor will set the appointment time
              and send you the video link.
            </p>
            {doctorsLoading && (
              <div className="mt-4 flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading doctors…
              </div>
            )}
            {!doctorsLoading && doctors.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {doctors.map((d) => (
                  <button
                    key={d.id ?? d.email}
                    type="button"
                    onClick={() => setSelectedDoctor(d)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      selectedDoctor?.email === d.email
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">
                      {d.firstName || ''} {d.lastName || ''}
                      {!d.firstName && !d.lastName && d.email}
                    </div>
                    <div className="text-gray-600">{d.specialty || '—'}</div>
                    <div className="text-xs text-gray-500 break-all mt-1">{d.email}</div>
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmitIntake} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Main symptoms or reason for visit *</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  required
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                  placeholder="e.g. fever and cough for 2 days"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Additional details</label>
                <textarea
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                  placeholder="Other history, questions, or context"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">How long have you had symptoms?</label>
                  <input
                    value={symptomDuration}
                    onChange={(e) => setSymptomDuration(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                    placeholder="e.g. 3 days, 2 weeks"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Current medications</label>
                <textarea
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                  placeholder="List current medicines if any"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Known allergies</label>
                <textarea
                  value={knownAllergies}
                  onChange={(e) => setKnownAllergies(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                  placeholder="Drug or other allergies"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !selectedDoctor}
                className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send request to doctor'}
              </button>
            </form>
          </div>

          <div className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <h3 className="font-semibold text-gray-900">Your telemedicine requests</h3>
            <p className="mt-1 text-sm text-gray-600">
              Track what you sent; when the doctor schedules, details and link appear here and under Video visits.
            </p>
            {!myIntakes.length ? (
              <p className="mt-4 text-sm text-gray-500">No requests yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {myIntakes.map((row) => {
                  const visit = getEffectiveVisit(row, invitationList);
                  const isBooked = row.status === 'VISIT_BOOKED';
                  return (
                    <li
                      key={row.id}
                      className={`rounded-xl border p-4 text-sm transition-shadow ${
                        isBooked && visit?.roomUrl
                          ? 'border-emerald-200 bg-white shadow-md ring-1 ring-emerald-100'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-gray-900">Dr. {row.doctorEmail}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.status === 'PENDING_REVIEW'
                              ? 'bg-amber-100 text-amber-900'
                              : row.status === 'VISIT_BOOKED'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {row.status === 'VISIT_BOOKED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {row.status === 'PENDING_REVIEW'
                            ? 'Awaiting doctor review'
                            : row.status === 'VISIT_BOOKED'
                              ? 'Approved — visit scheduled'
                              : row.status}
                        </span>
                      </div>
                      <div className="mt-2 text-gray-700">
                        <span className="font-medium">Your symptoms: </span>
                        {row.symptoms}
                      </div>
                      {isBooked && visit?.roomUrl && (
                        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/80 p-4">
                          <div className="flex items-center gap-2 font-semibold text-emerald-900">
                            <CalendarClock className="h-4 w-4" />
                            Video appointment
                          </div>
                          <div className="mt-2 grid gap-1 text-sm text-gray-800">
                            <div>
                              <span className="text-gray-600">Start: </span>
                              <strong>{formatLocal(visit.scheduledStartAt)}</strong>
                            </div>
                            <div>
                              <span className="text-gray-600">End: </span>
                              <strong>{formatLocal(visit.scheduledEndAt)}</strong>
                            </div>
                          </div>
                          <div className="mt-3 break-all rounded-md bg-white/90 p-2 font-mono text-xs text-indigo-800 border border-emerald-100">
                            {visit.roomUrl}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                              onClick={() => copyToClipboard(visit.roomUrl)}
                            >
                              Copy video link
                            </button>
                            {(() => {
                              const inv = invitationList.find(
                                (i) =>
                                  (i.intakeRequestId != null &&
                                    Number(i.intakeRequestId) === Number(row.id)) ||
                                  i.roomId === visit.roomId ||
                                  i.roomUrl === visit.roomUrl
                              );
                              const canStart =
                                inv && isWithinMeetingWindow(inv, nowTick);
                              const before = inv && isBeforeWindow(inv, nowTick);
                              if (!inv) return null;
                              return (
                                <button
                                  type="button"
                                  disabled={loading || !canStart}
                                  onClick={() => handlePatientStartFromInvitation(inv)}
                                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-45"
                                >
                                  {before ? 'Opens at scheduled time' : canStart ? 'Join video now' : 'Outside window'}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      {isBooked && !visit?.roomUrl && (
                        <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded p-2">
                          Doctor approved — fetching link &amp; times… If this stays empty, confirm your telemedicine API
                          URL (VITE_TELEMEDICINE_API_URL) and that both accounts use the correct doctor email.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {role === 'DOCTOR' && doctorSchedules.length > 0 && (
        <div className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
          <h3 className="font-semibold text-gray-900">Upcoming / live video visits</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {doctorSchedules.map((s) => {
              const canStart = isWithinMeetingWindow(s, nowTick);
              const before = isBeforeWindow(s, nowTick);
              const hasRoom = Boolean(s.roomUrl || s.roomId || s.publicRoomId);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-800">{s.patientEmail}</span>
                    {s.intakeRequestId != null && (
                      <span className="text-xs text-gray-500">Intake #{s.intakeRequestId}</span>
                    )}
                    <span className="text-gray-600">{formatLocal(s.scheduledStartAt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        s.status === 'LIVE'
                          ? 'font-medium text-emerald-700'
                          : 'rounded bg-amber-100 px-2 py-0.5 text-amber-900'
                      }
                    >
                      {s.status}
                    </span>
                    <button
                      type="button"
                      disabled={loading || !hasRoom || !canStart}
                      onClick={() => handleDoctorJoinSchedule(s)}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-45"
                    >
                      {!hasRoom
                        ? 'No room yet'
                        : before
                        ? 'Opens at scheduled time'
                        : canStart
                        ? 'Join session'
                        : 'Outside window'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {role === 'DOCTOR' && (
        <div className="mt-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/30 to-emerald-50/40 p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <History className="h-5 w-5 text-indigo-600" />
                Past telemedicine meetings
              </h3>
              <p className="mt-1 text-sm text-gray-600">Review completed consultation windows and patient notes.</p>
            </div>
            <span className="rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-700">
              {doctorPastMeetings.length} records
            </span>
          </div>

          {doctorPastError && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{doctorPastError}</p>
          )}

          {doctorPastLoading && !doctorPastMeetings.length && (
            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading past meetings...
            </div>
          )}

          {!doctorPastLoading && !doctorPastMeetingsSorted.length && !doctorPastError && (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white/70 px-4 py-6 text-sm text-gray-600">
              No past meetings yet. Completed sessions will appear here automatically.
            </div>
          )}

          {doctorPastMeetingsSorted.length > 0 && (
            <ul className="mt-5 space-y-3">
              {doctorPastMeetingsSorted.map((meeting) => {
                const startAt = meeting.startedAt ?? meeting.scheduledStartAt;
                const endAt = meeting.endedAt ?? meeting.scheduledEndAt;
                return (
                  <li key={meeting.id} className="rounded-xl border border-indigo-100 bg-white/90 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{meeting.patientEmail || 'Unknown patient'}</p>
                        {meeting.intakeRequestId != null && (
                          <p className="mt-1 text-xs text-gray-500">Intake #{meeting.intakeRequestId}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${historyStatusClasses(
                          meeting.status
                        )}`}
                      >
                        {meeting.status || 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Started</p>
                        <p className="mt-1 font-medium">{formatLocal(startAt)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Ended</p>
                        <p className="mt-1 font-medium">{formatLocal(endAt)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          Duration
                        </p>
                        <p className="mt-1 font-medium">{formatDuration(startAt, endAt)}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Consultation notes</p>
                    <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {meeting.consultationDetails || 'No consultation notes captured for this meeting.'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="break-all font-mono text-xs text-gray-500">Room: {meeting.roomId || '—'}</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(meeting.roomId)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Copy room ID
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">Session controls</h2>

            {role === 'DOCTOR' && (
              <div className="mt-6">
                <p className="text-sm text-gray-600">During the scheduled window, start or paste the room ID.</p>
                <button
                  type="button"
                  onClick={handleDoctorStartManual}
                  disabled={loading}
                  className="mt-3 w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
                >
                  Start / join video
                </button>
                <input
                  value={doctorRoomId}
                  onChange={(e) => setDoctorRoomId(e.target.value)}
                  placeholder="Room ID or URL"
                  className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-sm"
                />
              </div>
            )}

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Room ID or URL</label>
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleEnd}
              disabled={loading || !currentRoomId}
              className="mt-6 w-full rounded-lg bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-70"
            >
              End session
            </button>

            {session && (
              <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
                <div className="font-semibold text-gray-900">Active room</div>
                {session.consultationDetails && (
                  <div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-gray-700">
                    {session.consultationDetails}
                  </div>
                )}
                {session.scheduledStartAt && (
                  <div className="mt-2 text-gray-600">
                    Window: {formatLocal(session.scheduledStartAt)} – {formatLocal(session.scheduledEndAt)}
                  </div>
                )}
                <div className="mt-2 break-all text-gray-700">{session.roomId}</div>
                <button
                  type="button"
                  className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  onClick={() => copyToClipboard(session.roomUrl)}
                >
                  Copy URL
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-md sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">Video room</h2>
            {loading && (
              <div className="mt-4 flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Working…
              </div>
            )}
            {embedUrl ? (
              <div className="mt-4">
                <div className="text-xs text-gray-500 break-all">{embedUrl}</div>
                <div className="mt-3">
                  <iframe
                    title="Telemedicine video room"
                    src={embedUrl}
                    allow="camera; microphone; fullscreen; display-capture"
                    className="aspect-[16/10] w-full rounded-lg border border-gray-100"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-8 text-gray-600 text-sm">
                {role === 'DOCTOR'
                  ? 'Schedule a patient request above, then join here during the window.'
                  : 'After your doctor schedules, use Video visits or the link in Your requests.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
