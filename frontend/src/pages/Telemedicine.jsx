import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createTelemedicineSession,
  startTelemedicineSession,
  endTelemedicineSession,
} from '../api/telemedicineApi';

const JITSI_BASE_URL = 'https://meet.jit.si';

function getRoomIdFromUrl(input) {
  const raw = (input || '').trim();
  if (!raw) return '';

  // If it's already a roomId (no scheme), return as-is.
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

export default function Telemedicine() {
  const { token, role } = useAuth();

  const [session, setSession] = useState(null);
  const [joinInput, setJoinInput] = useState(''); // can be roomId or full room URL
  const [doctorRoomId, setDoctorRoomId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ended, setEnded] = useState(false);

  const embedUrl = useMemo(() => {
    if (session?.roomUrl) return session.roomUrl;
    const rid = getRoomIdFromUrl(joinInput);
    return buildRoomUrlFromRoomId(rid);
  }, [session, joinInput]);

  const currentRoomId = useMemo(() => {
    if (session?.roomId) return session.roomId;
    return getRoomIdFromUrl(joinInput);
  }, [session, joinInput]);

  const handleCreate = async () => {
    setError('');
    setEnded(false);
    setLoading(true);
    try {
      const data = await createTelemedicineSession(token);
      setSession(data);
      setJoinInput(data.roomUrl || data.roomId);
      setDoctorRoomId(data.roomId || getRoomIdFromUrl(data.roomUrl));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create a session');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorStart = async () => {
    setError('');
    setLoading(true);
    try {
      const rid = getRoomIdFromUrl(doctorRoomId || joinInput);
      if (!rid) {
        setError('Please enter a valid Room ID or Room URL');
        return;
      }
      await startTelemedicineSession(token, rid);
      setJoinInput(buildRoomUrlFromRoomId(rid));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to start session');
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
        setError('Please provide the Room ID to end the session');
        return;
      }
      await endTelemedicineSession(token, rid);
      setEnded(true);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard might be blocked in some browser contexts; ignore.
    }
  };

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Telemedicine</h1>
        <p className="mt-2 text-gray-600">Please log in to start or join a video consultation.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Consultation</h1>
          <p className="mt-2 text-gray-600">
            {role === 'DOCTOR'
              ? 'Start or join your patient consultation room.'
              : 'Create a consultation room and join instantly.'}
          </p>
        </div>
        {ended && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg font-medium">
            Session ended.
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Session Controls</h2>

            {role === 'PATIENT' && (
              <div className="mt-5">
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Consultation'}
                </button>
                <p className="mt-3 text-sm text-gray-600">
                  This creates a Jitsi room and gives you a Room ID/URL to share with your doctor.
                </p>
              </div>
            )}

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">Room ID or Room URL</label>
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="e.g. medi-stream-xxxxx or https://meet.jit.si/medi-stream-xxxxx"
                className="mt-2 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="mt-2 text-xs text-gray-500">
                Paste what you received from the patient/doctor.
              </div>
            </div>

            {role === 'DOCTOR' && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">Doctor Actions</label>
                <button
                  onClick={handleDoctorStart}
                  disabled={loading}
                  className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {loading ? 'Starting...' : 'Start Consultation'}
                </button>
                <input
                  value={doctorRoomId}
                  onChange={(e) => setDoctorRoomId(e.target.value)}
                  placeholder="(Optional) Room ID/URL to start"
                  className="mt-3 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleEnd}
                disabled={loading || !currentRoomId}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Ending...' : 'End Session'}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Ends the session on the backend (room stays accessible based on provider settings).
              </p>
            </div>

            {session && (
              <div className="mt-6 p-4 rounded-lg border border-gray-100 bg-gray-50">
                <div className="text-sm font-semibold text-gray-900">Your Created Room</div>
                <div className="mt-2 text-sm text-gray-700 break-all">
                  Room ID: {session.roomId}
                </div>
                <div className="mt-2 text-sm text-gray-700 break-all">
                  Room URL: {session.roomUrl}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    onClick={() => copyToClipboard(session.roomId)}
                  >
                    Copy ID
                  </button>
                  <button
                    className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    onClick={() => copyToClipboard(session.roomUrl)}
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Live Room</h2>

            {embedUrl ? (
              <div className="mt-4">
                <div className="text-xs text-gray-500">
                  Embedding: <span className="font-medium">{embedUrl}</span>
                </div>
                <div className="mt-3">
                  <iframe
                    title="Telemedicine video room"
                    src={embedUrl}
                    allow="camera; microphone; fullscreen; display-capture"
                    className="w-full aspect-[16/10] rounded-lg border border-gray-100"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-8 text-gray-600">
                Create or paste a room URL/ID to start the consultation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

