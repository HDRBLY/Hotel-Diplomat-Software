import io from 'socket.io-client';

// API configuration for different environments
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // Use relative URL for Vercel
  : 'http://localhost:3000/api';

const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin  // Use current domain for Vercel
  : 'http://localhost:3000';

// Socket connection
export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling']
});

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Rooms API
export const roomsApi = {
  getAll: () => apiCall('/rooms'),
  create: (roomData: any) => apiCall('/rooms', {
    method: 'POST',
    body: JSON.stringify(roomData),
  }),
  update: (id: string, roomData: any) => apiCall(`/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(roomData),
  }),
  delete: (id: string) => apiCall(`/rooms/${id}`, {
    method: 'DELETE',
  }),
  shift: (id: string, shiftData: any) => apiCall(`/rooms/${id}/shift`, {
    method: 'POST',
    body: JSON.stringify(shiftData),
  }),
};

// Guests API
export const guestsApi = {
  getAll: () => apiCall('/guests'),
  create: (guestData: any) => apiCall('/guests', {
    method: 'POST',
    body: JSON.stringify(guestData),
  }),
  update: (id: string, guestData: any) => apiCall(`/guests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(guestData),
  }),
};

// Users API
export const usersApi = {
  getAll: () => apiCall('/users'),
  login: (credentials: { username: string; password: string }) => apiCall('/users/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
};

// Reservations API
export const reservationsApi = {
  getAll: () => apiCall('/reservations'),
  create: (reservationData: any) => apiCall('/reservations', {
    method: 'POST',
    body: JSON.stringify(reservationData),
  }),
};

// Activities API
export const activitiesApi = {
  getAll: () => apiCall('/activities'),
};

// Reports API
export const reportsApi = {
  dashboard: () => apiCall('/reports/dashboard'),
  revenue: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiCall(`/reports/revenue?${params.toString()}`);
  },
  occupancy: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiCall(`/reports/occupancy?${params.toString()}`);
  },
  overview: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiCall(`/reports/overview?${params.toString()}`);
  },
  guests: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiCall(`/reports/guests?${params.toString()}`);
  },
  rooms: () => apiCall('/reports/rooms'),
  monthlyRevenue: () => apiCall('/reports/charts/monthly-revenue'),
  roomTypes: () => apiCall('/reports/charts/room-types'),
  guestSources: () => apiCall('/reports/charts/guest-sources'),
};

export default {
  rooms: roomsApi,
  guests: guestsApi,
  users: usersApi,
  reservations: reservationsApi,
  activities: activitiesApi,
  reports: reportsApi,
  socket,
}; 