const API_URL = 'http://localhost:8082/api/patients';

// --- PROFILE ENDPOINTS ---

export const getMedicalProfile = async (token) => {
    const response = await fetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Failed to fetch medical profile');
    return response.json();
};

export const updateMedicalProfile = async (token, profileData) => {
    const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
    });
    if (!response.ok) throw new Error('Failed to update medical profile');
    return response.json();
};

// --- REPORT ENDPOINTS--

export const getMedicalReports = async (token) => {
    const response = await fetch(`${API_URL}/reports`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch reports');
    return response.json();
};

export const uploadMedicalReport = async (token, file) => {
    // For files, we MUST use FormData instead of JSON
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/reports/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
            // CRITICAL: We DO NOT set 'Content-Type' here! 
            // The browser automatically sets it to 'multipart/form-data' with a special boundary string.
        },
        body: formData
    });
    if (!response.ok) throw new Error('Failed to upload report');
    return response.json();
};

export const downloadReportSecurely = async (token, fileName, originalName) => {
    const response = await fetch(`${API_URL}/reports/download/${fileName}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to download file');
    
    const blob = await response.blob();
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // CRITICAL FIX: Tell the browser to save the file using the original name!
    link.download = originalName || fileName; 
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
};

export const getAllPatients = async (token) => {
    const response = await fetch('http://localhost:8082/api/patients/all', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Failed to fetch patient records');
    return response.json();
};