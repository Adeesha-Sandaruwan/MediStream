import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_TELEMEDICINE_API_URL || 'http://localhost:8083/api/telemedicine';

export const createTelemedicineSession = async (token) => {
  const response = await axios.post(
    `${API_BASE}/session`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data; // { roomId, roomUrl, shareUrl }
};

export const startTelemedicineSession = async (token, roomId) => {
  const response = await axios.post(
    `${API_BASE}/session/${encodeURIComponent(roomId)}/start`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

export const endTelemedicineSession = async (token, roomId) => {
  const response = await axios.post(
    `${API_BASE}/session/${encodeURIComponent(roomId)}/end`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

