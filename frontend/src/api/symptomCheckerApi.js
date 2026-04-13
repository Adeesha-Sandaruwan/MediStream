const API_BASE = import.meta.env.VITE_SYMPTOM_CHECKER_API_URL || 'http://localhost:8088/api/v1/symptom-check';

const buildHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const parseError = async (response, fallback) => {
  try {
    const data = await response.json();
    return data.message || data.error || data.detail || fallback;
  } catch {
    try {
      const text = await response.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
};

export const analyzeSymptoms = async (token, payload) => {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to analyze symptoms'));
  }

  return response.json();
};
