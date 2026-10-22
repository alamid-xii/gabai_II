import { API } from '../config/api';

const API_URL = API;

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create enrollment
export const createEnrollment = async (enrollmentData) => {
  try {
    
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }
    
    const response = await fetch(`${API_URL}/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(enrollmentData)
    });
    
    
    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      console.error('API Error Response:', error);
      
      // Format validation errors if present
      if (error.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors.map(e => `${e.field}: ${e.message}`).join(', ');
        throw new Error(errorMessages);
      }
      
      throw new Error(error.message || error.error || `Failed to save enrollment (${response.status})`);
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('API Call Error:', error);
    
    // Check if it's a network error
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('Network error: Cannot connect to server. Please check your internet connection.');
    }
    
    throw error;
  }
};

// Get all enrollments (admin only)
export const getEnrollments = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  
  const response = await fetch(`${API_URL}/enrollments?${params}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch enrollments');
  }
  
  return response.json();
};

// Get single enrollment by ID
export const getEnrollmentById = async (id) => {
  const response = await fetch(`${API_URL}/enrollments/${id}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch enrollment');
  }
  
  return response.json();
};

// Get user's enrollments
export const getUserEnrollments = async (userId) => {
  const response = await fetch(`${API_URL}/enrollments/user/${userId}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch enrollments');
  }
  
  return response.json();
};

// Update enrollment
export const updateEnrollment = async (id, enrollmentData) => {
  const response = await fetch(`${API_URL}/enrollments/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(enrollmentData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to update enrollment');
  }
  
  return response.json();
};

// Update enrollment status (admin only)
export const updateEnrollmentStatus = async (id, status) => {
  const response = await fetch(`${API_URL}/enrollments/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ status })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to update status');
  }
  
  return response.json();
};

// Delete enrollment record
export const deleteEnrollment = async (id) => {
  const response = await fetch(`${API_URL}/enrollments/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to delete enrollment');
  }
  
  return response.json();
};

// Download enrollment PDF
export const downloadEnrollmentPDF = async (id) => {
  const response = await fetch(`${API_URL}/enrollments/${id}/pdf`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to download PDF');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `enrollment-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// Upload credential documents for an enrollment
// files: { documentType: File } e.g. { f138: File, birthCert: File }
export const uploadEnrollmentDocuments = async (enrollmentId, files) => {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required. Please log in.');

  const formData = new FormData();
  for (const [docType, file] of Object.entries(files)) {
    if (file) formData.append(docType, file);
  }

  const response = await fetch(`${API_URL}/enrollments/${enrollmentId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to upload documents');
  }

  return response.json();
};

// Get all uploaded documents for an enrollment
export const getEnrollmentDocuments = async (enrollmentId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/enrollments/${enrollmentId}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch documents');
  }

  return response.json();
};

// Delete a specific document
export const deleteEnrollmentDocument = async (enrollmentId, docId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/enrollments/${enrollmentId}/documents/${docId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete document');
  }

  return response.json();
};

// Resubmit a returned enrollment
export const resubmitEnrollment = async (enrollmentId) => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/enrollments/${enrollmentId}/resubmit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to resubmit enrollment');
  }
  return response.json();
};
