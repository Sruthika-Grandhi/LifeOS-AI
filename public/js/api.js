const API_BASE = '/api';

// Safe fetch wrapper that inserts JWT header dynamically
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('lifeos_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    // Intercept authentication errors to redirect user
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('lifeos_token');
      localStorage.removeItem('lifeos_user');
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

const API = {
  // Auth Operations
  login: async (username, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    localStorage.setItem('lifeos_token', data.token);
    localStorage.setItem('lifeos_user', JSON.stringify(data.user));
    return data;
  },

  register: async (username, password) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    localStorage.setItem('lifeos_token', data.token);
    localStorage.setItem('lifeos_user', JSON.stringify(data.user));
    return data;
  },

  logout: () => {
    localStorage.removeItem('lifeos_token');
    localStorage.removeItem('lifeos_user');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('lifeos_token');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('lifeos_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Profile Operations
  getProfile: async () => {
    return request('/profile');
  },

  updateProfile: async (profileData) => {
    return request('/profile', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  },

  changePassword: async (currentPassword, newPassword) => {
    return request('/profile/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // Logs Operations
  getLogs: async () => {
    return request('/logs');
  },

  saveLog: async (logData) => {
    return request('/logs', {
      method: 'POST',
      body: JSON.stringify(logData)
    });
  },

  // Tasks Operations
  getTasks: async () => {
    return request('/tasks');
  },

  addTask: async (taskData) => {
    return request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  toggleTask: async (taskId) => {
    return request(`/tasks/${taskId}/toggle`, {
      method: 'POST'
    });
  },

  deleteTask: async (taskId) => {
    return request(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  },

  // Dashboard Operations
  getDashboardSummary: async () => {
    return request('/dashboard/summary');
  }
};
