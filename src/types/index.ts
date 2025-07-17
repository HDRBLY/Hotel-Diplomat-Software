// Type definitions for Hotel Diplomat Residency Software

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  email: string
  avatar?: string
  permissions: string[]
  lastLogin?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type UserRole = 'admin' | 'manager' | 'staff' | 'accounts'

export interface Room {
  id: string
  number: string
  type: RoomType
  category: RoomCategory
  status: RoomStatus
  price: number
  capacity: number
  amenities: string[]
  description?: string
  floor: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type RoomType = 'single' | 'double' | 'triple' | 'suite' | 'deluxe'
export type RoomCategory = 'standard' | 'premium' | 'luxury' | 'presidential'
export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'cleaning'

export interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: Address
  idProof: IdProof
  checkInDate?: string
  checkOutDate?: string
  roomId?: string
  roomNumber?: string
  status: GuestStatus
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Address {
  street: string
  city: string
  state: string
  country: string
  postalCode: string
}

export interface IdProof {
  type: 'aadhar' | 'pan' | 'passport' | 'driving_license'
  number: string
  issuedBy: string
  validUntil?: string
}

export type GuestStatus = 'checked_in' | 'checked_out' | 'reserved' | 'cancelled'

export interface Reservation {
  id: string
  guestId: string
  guestName: string
  roomId: string
  roomNumber: string
  checkInDate: string
  checkOutDate: string
  adults: number
  children: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: ReservationStatus
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod
  specialRequests?: string
  createdAt: string
  updatedAt: string
}

export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed'
export type PaymentStatus = 'pending' | 'partial' | 'completed' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer'

export interface DashboardStats {
  occupiedRooms: number
  availableRooms: number
  totalRooms: number
  todayCheckins: number
  todayCheckouts: number
  todayRevenue: number
  pendingReservations: number
  maintenanceRooms: number
  cleaningRooms: number
  reservedRooms: number
  totalGuests: number
  occupancyRate: number
  revenue: number
  monthlyRevenue: number
  yearlyRevenue: number
}

export interface RecentActivity {
  id: string
  type: ActivityType
  guestName: string
  roomNumber: string
  time: string
  status: ActivityStatus
  amount?: number
}

export type ActivityType = 'checkin' | 'checkout' | 'reservation' | 'payment' | 'maintenance'
export type ActivityStatus = 'completed' | 'pending' | 'cancelled' | 'failed'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  statusCode?: number
  timestamp?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SearchFilters {
  search?: string
  status?: string
  type?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  minPrice?: number
  maxPrice?: number
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

export interface TableColumn<T = any> {
  key: keyof T
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: T) => React.ReactNode
}

export interface NotificationData {
  type: NotificationType
  message: string
  isVisible: boolean
  duration?: number
  id?: string
  persistent?: boolean
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'select' | 'textarea' | 'checkbox'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  validation?: {
    pattern?: RegExp
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    custom?: (value: any) => string | undefined
  }
}

export interface ChartData {
  name: string
  value: number
  color?: string
}

export interface ReportData {
  title: string
  data: ChartData[]
  total?: number
  change?: number
  changeType?: 'increase' | 'decrease'
}

export interface Settings {
  hotelName: string
  address: Address
  phone: string
  email: string
  website?: string
  currency: string
  timezone: string
  checkInTime: string
  checkOutTime: string
  taxRate: number
  lateCheckoutFee: number
  cancellationPolicy: string
  amenities: string[]
  roomTypes: RoomType[]
  roomCategories: RoomCategory[]
}

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error | null
  errorInfo?: React.ErrorInfo | null
}

export interface LoadingState {
  isLoading: boolean
  error?: string
  retry?: () => void
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
}

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
} 