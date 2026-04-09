const API_URL = 'http://localhost:8082/api/patients';

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

export const getMyPatientProfile = async (token) => {
    const response = await fetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Failed to fetch patient profile');
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
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/reports/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
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

export const getMyPrescriptionsAsPatient = async (token) => {
    const response = await fetch('http://localhost:8084/api/doctors/prescriptions/patient/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Failed to fetch digital prescriptions');
    return response.json();
};

export const getAllVerifiedDoctors = async (token) => {
    const response = await fetch('http://localhost:8084/api/doctors/all', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) throw new Error('Failed to fetch doctor directory');
    
    return response.json();
};

export const getDoctorAvailability = async (token, doctorEmail) => {
    const response = await fetch(`http://localhost:8084/api/doctors/availability/doctor/${doctorEmail}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) throw new Error('Failed to fetch doctor availability');
    
    return response.json();
};