const API_URL = 'http://localhost:8081/api/admin/users';

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

export const getAllUsers = async (token) => {
    const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error(await parseError(response, `Failed to fetch users (HTTP ${response.status})`));
    }
    return response.json();
};

export const createUser = async (token, userData) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error(await parseError(response, 'Failed to create user'));
    return response.json();
};

export const updateUserRole = async (token, id, role) => {
    const response = await fetch(`${API_URL}/${id}/role`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error(await parseError(response, 'Failed to update user role'));
    return response.json();
};

export const updateUserStatus = async (token, id, status) => {
    const response = await fetch(`${API_URL}/${id}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error(await parseError(response, 'Failed to update user status'));
    return response.json();
};

export const deleteUser = async (token, id) => {
    const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error(await parseError(response, 'Failed to delete user'));
    return response.text();
};