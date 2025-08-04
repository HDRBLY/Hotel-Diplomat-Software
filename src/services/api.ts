// API Service Layer for Hotel Diplomat Residency
// This service layer will handle all API calls and provide a clean interface for the frontend

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  statusCode?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const API_TIMEOUT = 30000; // 30 seconds

export const api = {
  // Rooms
  getRooms: async () => {
    const response = await fetch(`${API_BASE_URL}/rooms`);
    if (!response.ok) throw new Error('Failed to fetch rooms');
    return response.json();
  },

  addRoom: async (roomData: any) => {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomData),
    });
    if (!response.ok) throw new Error('Failed to add room');
    return response.json();
  },

  updateRoom: async (id: string, roomData: any) => {
    const response = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomData),
    });
    if (!response.ok) throw new Error('Failed to update room');
    return response.json();
  },

  deleteRoom: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete room');
    return response.json();
  },

  // Guests
  getGuests: async () => {
    const response = await fetch(`${API_BASE_URL}/guests`);
    if (!response.ok) throw new Error('Failed to fetch guests');
    return response.json();
  },

  addGuest: async (guestData: any) => {
    const response = await fetch(`${API_BASE_URL}/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestData),
    });
    if (!response.ok) throw new Error('Failed to add guest');
    return response.json();
  },

  updateGuest: async (id: string, guestData: any) => {
    const response = await fetch(`${API_BASE_URL}/guests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestData),
    });
    if (!response.ok) throw new Error('Failed to update guest');
    return response.json();
  },

  // Authentication
  login: async (credentials: { username: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  // Reports
  getDashboardData: async () => {
    const response = await fetch(`${API_BASE_URL}/reports/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    return response.json();
  },
};

export { SOCKET_URL };

// Request interceptor to add auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('hdr_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// Generic API request function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized access
        localStorage.removeItem('hdr_auth_token')
        localStorage.removeItem('hdr_user')
        window.location.href = '/login'
        throw new Error('Unauthorized access. Please login again.')
      }

      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.')
      }
      throw error
    }
    
    throw new Error('An unexpected error occurred.')
  }
}

// Authentication API
export const authAPI = {
  login: async (username: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  logout: async (): Promise<ApiResponse> => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    })
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    return apiRequest('/auth/refresh', {
      method: 'POST',
    })
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse> => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  },
}

// Users API
export const usersAPI = {
  getProfile: async (): Promise<ApiResponse<any>> => {
    return apiRequest('/users/profile')
  },

  updateProfile: async (data: any): Promise<ApiResponse<any>> => {
    return apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  getAllUsers: async (params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<any[]>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    
    return apiRequest(`/users?${searchParams.toString()}`)
  },

  createUser: async (userData: any): Promise<ApiResponse<any>> => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  updateUser: async (userId: string, userData: any): Promise<ApiResponse<any>> => {
    return apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  },

  deleteUser: async (userId: string): Promise<ApiResponse> => {
    return apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    })
  },
}

// Rooms API
export const roomsAPI = {
  getAllRooms: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string; 
    type?: string; 
    category?: string 
  }): Promise<ApiResponse<any[]>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.type) searchParams.append('type', params.type)
    if (params?.category) searchParams.append('category', params.category)
    
    return apiRequest(`/rooms?${searchParams.toString()}`)
  },

  getRoomById: async (roomId: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/rooms/${roomId}`)
  },

  createRoom: async (roomData: any): Promise<ApiResponse<any>> => {
    return apiRequest('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    })
  },

  updateRoom: async (roomId: string, roomData: any): Promise<ApiResponse<any>> => {
    return apiRequest(`/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    })
  },

  deleteRoom: async (roomId: string): Promise<ApiResponse> => {
    return apiRequest(`/rooms/${roomId}`, {
      method: 'DELETE',
    })
  },

  changeRoomStatus: async (roomId: string, status: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/rooms/${roomId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  checkoutRoom: async (roomId: string, checkoutData: any): Promise<ApiResponse<any>> => {
    return apiRequest(`/rooms/${roomId}/checkout`, {
      method: 'POST',
      body: JSON.stringify(checkoutData),
    })
  },

  shiftRoom: async (roomId: string, shiftData: any): Promise<ApiResponse<any>> => {
    return apiRequest(`/rooms/${roomId}/shift`, {
      method: 'POST',
      body: JSON.stringify(shiftData),
    })
  },

  getRoomShifts: async (params?: { 
    page?: number; 
    limit?: number; 
    fromDate?: string; 
    toDate?: string 
  }): Promise<ApiResponse<any[]>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate)
    if (params?.toDate) searchParams.append('toDate', params.toDate)
    
    return apiRequest(`/room-shifts?${searchParams.toString()}`)
  },
}

// Guests API
export const guestsAPI = {
  getAllGuests: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string 
  }): Promise<ApiResponse<any[]>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)
    
    return apiRequest(`/guests?${searchParams.toString()}`)
  },

  getGuestById: async (guestId: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/guests/${guestId}`)
  },

  createGuest: async (guestData: any): Promise<ApiResponse<any>> => {
    return apiRequest('/guests', {
      method: 'POST',
      body: JSON.stringify(guestData),
    })
  },

  updateGuest: async (guestId: string, guestData: any): Promise<ApiResponse<any>> => {
    return apiRequest(`/guests/${guestId}`, {
      method: 'PUT',
      body: JSON.stringify(guestData),
    })
  },

  deleteGuest: async (guestId: string): Promise<ApiResponse> => {
    return apiRequest(`/guests/${guestId}`, {
      method: 'DELETE',
    })
  },

  checkInGuest: async (guestId: string, checkInData: any): Promise<ApiResponse<any>> => {
    return apiRequest(`/guests/${guestId}/checkin`, {
      method: 'POST',
      body: JSON.stringify(checkInData),
    })
  },

  checkOutGuest: async (guestId: string, checkOutData: any): Promise<ApiResponse<any>> => {
    return apiRequest(`/guests/${guestId}/checkout`, {
      method: 'POST',
      body: JSON.stringify(checkOutData),
    })
  },
}

// Reservations API
export const reservationsAPI = {
  getAllReservations: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string; 
    dateFilter?: string 
  }): Promise<ApiResponse<any[]>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.dateFilter) searchParams.append('dateFilter', params.dateFilter)
    
    return apiRequest(`/reservations?${searchParams.toString()}`)
  },

  getReservationById: async (reservationId: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/reservations/${reservationId}`)
  },

  createReservation: async (reservationData: any): Promise<ApiResponse<any>> => {
    return apiRequest('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    })
  },

  updateReservation: async (reservationId: string, reservationData: any): Promise<ApiResponse<any>> => {
    return apiRequest(`/reservations/${reservationId}`, {
      method: 'PUT',
      body: JSON.stringify(reservationData),
    })
  },

  deleteReservation: async (reservationId: string): Promise<ApiResponse> => {
    return apiRequest(`/reservations/${reservationId}`, {
      method: 'DELETE',
    })
  },

  confirmReservation: async (reservationId: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/reservations/${reservationId}/confirm`, {
      method: 'PATCH',
    })
  },

  cancelReservation: async (reservationId: string, reason?: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/reservations/${reservationId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
  },
}

// Reports API
export const reportsAPI = {
  getDashboardStats: async (): Promise<ApiResponse<any>> => {
    return apiRequest('/reports/dashboard')
  },

  getOccupancyReport: async (params?: { 
    fromDate?: string; 
    toDate?: string; 
    roomType?: string 
  }): Promise<ApiResponse<any>> => {
    const searchParams = new URLSearchParams()
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate)
    if (params?.toDate) searchParams.append('toDate', params.toDate)
    if (params?.roomType) searchParams.append('roomType', params.roomType)
    
    return apiRequest(`/reports/occupancy?${searchParams.toString()}`)
  },

  getRevenueReport: async (params?: { 
    fromDate?: string; 
    toDate?: string; 
    groupBy?: string 
  }): Promise<ApiResponse<any>> => {
    const searchParams = new URLSearchParams()
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate)
    if (params?.toDate) searchParams.append('toDate', params.toDate)
    if (params?.groupBy) searchParams.append('groupBy', params.groupBy)
    
    return apiRequest(`/reports/revenue?${searchParams.toString()}`)
  },

  getGuestReport: async (params?: { 
    fromDate?: string; 
    toDate?: string; 
    guestType?: string 
  }): Promise<ApiResponse<any>> => {
    const searchParams = new URLSearchParams()
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate)
    if (params?.toDate) searchParams.append('toDate', params.toDate)
    if (params?.guestType) searchParams.append('guestType', params.guestType)
    
    return apiRequest(`/reports/guests?${searchParams.toString()}`)
  },

  exportReport: async (reportType: string, params?: any): Promise<ApiResponse<{ downloadUrl: string }>> => {
    return apiRequest(`/reports/${reportType}/export`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}

// Settings API
export const settingsAPI = {
  getSettings: async (): Promise<ApiResponse<any>> => {
    return apiRequest('/settings')
  },

  updateSettings: async (settings: any): Promise<ApiResponse<any>> => {
    return apiRequest('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },

  getSystemInfo: async (): Promise<ApiResponse<any>> => {
    return apiRequest('/settings/system-info')
  },

  backupDatabase: async (): Promise<ApiResponse<{ downloadUrl: string }>> => {
    return apiRequest('/settings/backup', {
      method: 'POST',
    })
  },

  restoreDatabase: async (backupFile: File): Promise<ApiResponse> => {
    const formData = new FormData()
    formData.append('backup', backupFile)
    
    return apiRequest('/settings/restore', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData
      },
      body: formData,
    })
  },
}

// File Upload API
export const uploadAPI = {
  uploadImage: async (file: File, type: 'profile' | 'room' | 'guest'): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    
    return apiRequest('/upload/image', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData
      },
      body: formData,
    })
  },

  uploadDocument: async (file: File, type: 'guest' | 'reservation'): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    
    return apiRequest('/upload/document', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData
      },
      body: formData,
    })
  },
}

// WebSocket connection for real-time updates
export class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000

  connect(token: string) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws'
    this.ws = new WebSocket(`${wsUrl}?token=${token}`)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return this.ws
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        const token = localStorage.getItem('hdr_auth_token')
        if (token) {
          this.connect(token)
        }
      }, this.reconnectInterval * this.reconnectAttempts)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }
}

// Export the WebSocket service instance
export const wsService = new WebSocketService()

// Error handling utilities
export const handleApiError = (error: any): string => {
  if (error.message) {
    return error.message
  }
  return 'An unexpected error occurred. Please try again.'
}

// API response validation
export const validateApiResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.error || response.message || 'API request failed')
  }
  return response.data!
}

// Export all APIs
export default {
  auth: authAPI,
  users: usersAPI,
  rooms: roomsAPI,
  guests: guestsAPI,
  reservations: reservationsAPI,
  reports: reportsAPI,
  settings: settingsAPI,
  upload: uploadAPI,
  ws: wsService,
} 