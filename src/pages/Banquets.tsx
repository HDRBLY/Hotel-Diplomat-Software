import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../components/AuthContext'
import Notification, { useNotification } from '../components/Notification'
import { banquetsAPI } from '../services/api'
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

interface BanquetHall {
  id: string
  name: string
  capacity: number
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'cleaning'
  type: 'wedding' | 'corporate' | 'party' | 'conference'
  floor: number
  price: number
  amenities: string[]
  description: string
  image: string
  currentEvent?: {
    eventName: string
    clientName: string
    startDate: string
    endDate: string
    guestCount: number
  }
  createdAt?: string
  updatedAt?: string
}

interface BanquetBooking {
  id: string
  hallId: string
  hallName: string
  eventName: string
  clientName: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  eventType: 'wedding' | 'corporate' | 'party' | 'conference' | 'other'
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  guestCount: number
  expectedGuests: number
  totalAmount: number
  advanceAmount: number
  balanceAmount: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'pending'
  cateringRequired: boolean
  decorationRequired: boolean
  soundSystemRequired: boolean
  photographyRequired: boolean
  specialRequirements: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  bookingDate: string
  createdBy: string
  notes: string
}

const Banquets = () => {
  const { hasPermission, user } = useAuth()
  const { notification, showNotification, hideNotification } = useNotification()
  
  const [halls, setHalls] = useState<BanquetHall[]>([])
  const [bookings, setBookings] = useState<BanquetBooking[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedHall, setSelectedHall] = useState<BanquetHall | null>(null)
  const [showAddHall, setShowAddHall] = useState(false)
  const [showEditHall, setShowEditHall] = useState(false)
  const [editingHall, setEditingHall] = useState<BanquetHall | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Booking related states
  const [showCalendar, setShowCalendar] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedDates, setSelectedDates] = useState<{start: string, end: string} | null>(null)
  const [bookingHall, setBookingHall] = useState<BanquetHall | null>(null)
  const [showBookings, setShowBookings] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    eventName: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    eventType: 'wedding' as const,
    startTime: '',
    endTime: '',
    expectedGuests: 0,
    advanceAmount: 0,
    paymentMethod: 'cash' as const,
    cateringRequired: false,
    decorationRequired: false,
    soundSystemRequired: false,
    photographyRequired: false,
    specialRequirements: '',
    notes: ''
  })

  // Available amenities for banquet halls
  const availableAmenities = [
    { id: 'ac', label: 'Air Conditioning', icon: 'ac' },
    { id: 'sound', label: 'Sound System', icon: 'sound' },
    { id: 'projector', label: 'Projector', icon: 'projector' },
    { id: 'stage', label: 'Stage', icon: 'stage' },
    { id: 'dance', label: 'Dance Floor', icon: 'dance' },
    { id: 'catering', label: 'Catering Kitchen', icon: 'catering' },
    { id: 'parking', label: 'Parking', icon: 'parking' },
    { id: 'security', label: 'Security', icon: 'security' },
    { id: 'decoration', label: 'Decoration', icon: 'decoration' },
    { id: 'lighting', label: 'Professional Lighting', icon: 'lighting' },
    { id: 'photography', label: 'Photography Setup', icon: 'photography' },
    { id: 'valet', label: 'Valet Service', icon: 'valet' }
  ]

  // Default banquet halls data
  const defaultHalls: BanquetHall[] = [
    {
      id: '1',
      name: 'Royal Grand Hall',
      capacity: 500,
      status: 'available',
      type: 'wedding',
      floor: 1,
      price: 50000,
      amenities: ['ac', 'sound', 'stage', 'dance', 'catering', 'parking', 'decoration', 'lighting'],
      description: 'Our largest and most elegant banquet hall, perfect for grand weddings and corporate events. Features a spacious dance floor and professional lighting.',
      image: '/images/banquets/royal-grand-hall.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Crystal Ballroom',
      capacity: 300,
      status: 'available',
      type: 'corporate',
      floor: 2,
      price: 35000,
      amenities: ['ac', 'sound', 'projector', 'stage', 'catering', 'parking', 'security', 'photography'],
      description: 'A sophisticated venue ideal for corporate meetings, conferences, and elegant parties. Equipped with modern AV facilities.',
      image: '/images/banquets/crystal-ballroom.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Garden Pavilion',
      capacity: 200,
      status: 'available',
      type: 'party',
      floor: 0,
      price: 25000,
      amenities: ['sound', 'dance', 'catering', 'parking', 'decoration', 'lighting', 'photography', 'valet'],
      description: 'An outdoor venue with beautiful garden views, perfect for intimate celebrations and outdoor parties.',
      image: '/images/banquets/garden-pavilion.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '4',
      name: 'Executive Conference Room',
      capacity: 100,
      status: 'available',
      type: 'conference',
      floor: 3,
      price: 15000,
      amenities: ['ac', 'sound', 'projector', 'catering', 'parking', 'security'],
      description: 'A modern conference room with state-of-the-art facilities, ideal for business meetings and small corporate events.',
      image: '/images/banquets/executive-conference.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  // Fetch halls and bookings from backend and setup realtime
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const hallsRes = await banquetsAPI.getHalls()
        if (hallsRes.success) {
          setHalls((hallsRes.data || []) as BanquetHall[])
        } else {
          setHalls(defaultHalls)
        }

        const bookingsRes = await banquetsAPI.getBookings()
        if (bookingsRes.success) {
          setBookings((bookingsRes.data || []) as BanquetBooking[])
        } else {
          setBookings([])
        }
      } catch (error) {
        console.error('Error fetching banquet halls:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch banquet halls'
        setError(errorMessage)
        if (halls.length === 0) setHalls(defaultHalls)
        showNotification('error', `Failed to fetch banquets: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    const s = io(BACKEND_URL)
    s.on('banquet_booking_created', (booking: BanquetBooking) => {
      setBookings(prev => [booking, ...prev])
    })
    s.on('banquet_booking_deleted', ({ id }: { id: string }) => {
      setBookings(prev => prev.filter(b => b.id !== id))
    })
    s.on('banquet_hall_updated', () => {
      banquetsAPI.getHalls().then(res => {
        if (res.success) setHalls((res.data || []) as BanquetHall[])
      }).catch(() => {})
    })
    s.on('data_cleared', () => {
      fetchData()
    })

    return () => {
      s.disconnect()
      s.removeAllListeners()
    }
  }, [])

  // Filter halls based on search and filters
  const filteredHalls = halls.filter(hall => {
    const matchesSearch = hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hall.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || hall.status === statusFilter
    const matchesType = typeFilter === 'all' || hall.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const isDateBooked = (date: Date, hallId: string) => {
    const dateStr = formatDate(date)
    return bookings.some(booking => 
      booking.hallId === hallId && 
      dateStr >= booking.startDate && 
      dateStr <= booking.endDate
    )
  }

  const isDateInPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const canSelectDate = (date: Date, hallId: string) => {
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 5)
    return date <= maxDate && !isDateBooked(date, hallId) && !isDateInPast(date)
  }

  // Booking handlers
  const handleBookHall = (hall: BanquetHall) => {
    setBookingHall(hall)
    setShowCalendar(true)
    setCurrentMonth(new Date())
    setSelectedDate(null)
    setSelectedDates(null)
  }

  const handleDateSelect = (date: Date) => {
    if (!bookingHall || !canSelectDate(date, bookingHall.id)) return
    
    setSelectedDate(date)
    
    if (!selectedDates) {
      setSelectedDates({ start: formatDate(date), end: formatDate(date) })
    } else if (!selectedDates.end || selectedDates.end < formatDate(date)) {
      setSelectedDates({ ...selectedDates, end: formatDate(date) })
    } else {
      setSelectedDates({ start: formatDate(date), end: formatDate(date) })
    }
  }

  const handleProceedToBooking = () => {
    if (!selectedDates || !bookingHall) return
    
    setShowCalendar(false)
    setShowBookingForm(true)
    
    // Calculate total amount
    const startDate = new Date(selectedDates.start)
    const endDate = new Date(selectedDates.end)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    setBookingForm(prev => ({
      ...prev,
      expectedGuests: bookingHall.capacity,
      advanceAmount: Math.round((bookingHall.price * days) * 0.3) // 30% of total
    }))
  }

  const handleBookingSubmit = async () => {
    if (!selectedDates || !bookingHall || !user) return
    
    // Validation
    if (!bookingForm.eventName || !bookingForm.clientName || !bookingForm.clientPhone) {
      showNotification('error', 'Please fill in all required fields')
      return
    }
    
    // Compute total for selected range
    const startDate = new Date(selectedDates.start)
    const endDate = new Date(selectedDates.end)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const totalAmount = bookingHall.price * days

    try {
      const res = await banquetsAPI.createBooking({
        hallId: bookingHall.id,
        eventName: bookingForm.eventName,
        clientName: bookingForm.clientName,
        clientEmail: bookingForm.clientEmail,
        clientPhone: bookingForm.clientPhone,
        clientAddress: bookingForm.clientAddress,
        eventType: bookingForm.eventType,
        startDate: selectedDates.start,
        endDate: selectedDates.end,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        expectedGuests: bookingForm.expectedGuests,
        totalAmount: totalAmount,
        advanceAmount: bookingForm.advanceAmount,
        paymentMethod: bookingForm.paymentMethod,
        cateringRequired: bookingForm.cateringRequired,
        decorationRequired: bookingForm.decorationRequired,
        soundSystemRequired: bookingForm.soundSystemRequired,
        photographyRequired: bookingForm.photographyRequired,
        specialRequirements: bookingForm.specialRequirements,
        notes: bookingForm.notes,
        createdBy: user.name
      })

      if (!res.success || !res.data) {
        showNotification('error', res.message || 'Failed to create booking')
        return
      }

      setBookings(prev => [res.data as BanquetBooking, ...prev])

      setBookingForm({
        eventName: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientAddress: '',
        eventType: 'wedding',
        startTime: '',
        endTime: '',
        expectedGuests: 0,
        advanceAmount: 0,
        paymentMethod: 'cash',
        cateringRequired: false,
        decorationRequired: false,
        soundSystemRequired: false,
        photographyRequired: false,
        specialRequirements: '',
        notes: ''
      })

      setShowBookingForm(false)
      setSelectedDates(null)
      setBookingHall(null)
      showNotification('success', 'Banquet booking confirmed successfully!')
    } catch (error: any) {
      const msg = error?.message || ''
      if (msg.includes('overlap')) {
        showNotification('error', 'Selected dates overlap with an existing booking')
      } else {
        console.error('Error creating booking:', error)
        showNotification('error', 'Failed to create booking. Please try again.')
      }
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'occupied': return 'bg-red-100 text-red-800'
      case 'reserved': return 'bg-blue-100 text-blue-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'cleaning': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'wedding': return 'bg-pink-100 text-pink-800'
      case 'corporate': return 'bg-blue-100 text-blue-800'
      case 'party': return 'bg-green-100 text-green-800'
      case 'conference': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get amenity icon
  const getAmenityIcon = (amenityId: string) => {
    switch (amenityId) {
      case 'ac': return '❄️'
      case 'sound': return '🔊'
      case 'projector': return '📽️'
      case 'stage': return '🎭'
      case 'dance': return '💃'
      case 'catering': return '🍽️'
      case 'parking': return '🅿️'
      case 'security': return '🛡️'
      case 'decoration': return '🎨'
      case 'lighting': return '💡'
      case 'photography': return '📸'
      case 'valet': return '🚗'
      default: return '✨'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading banquet halls...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Building2 className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Banquet Halls</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                Banquet Halls
              </h1>
              <p className="text-gray-600 mt-2">Manage your hotel's banquet halls and events</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBookings(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Calendar className="h-5 w-5" />
                View Bookings
              </button>
              {hasPermission('banquets:create') && (
                <button
                  onClick={() => setShowAddHall(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add Hall
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search halls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="maintenance">Maintenance</option>
                <option value="cleaning">Cleaning</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="wedding">Wedding</option>
                <option value="corporate">Corporate</option>
                <option value="party">Party</option>
                <option value="conference">Conference</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setTypeFilter('all')
                }}
                className="w-full px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Banquet Halls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredHalls.map((hall) => (
            <div
              key={hall.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Hall Image */}
              <div className="relative h-48 bg-gray-200">
                <img
                  src={hall.image}
                  alt={hall.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image doesn't exist
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4='
                  }}
                />
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(hall.status)}`}>
                    {hall.status.charAt(0).toUpperCase() + hall.status.slice(1)}
                  </span>
                </div>
                {hall.currentEvent && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black bg-opacity-75 text-white p-3 rounded-lg">
                      <div className="text-sm font-medium">{hall.currentEvent.eventName}</div>
                      <div className="text-xs opacity-90">{hall.currentEvent.clientName}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hall Details */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{hall.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getTypeColor(hall.type)}`}>
                      {hall.type.charAt(0).toUpperCase() + hall.type.slice(1)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">₹{hall.price.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">per event</div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{hall.description}</p>

                {/* Capacity and Floor */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{hall.capacity} guests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    <span>Floor {hall.floor}</span>
                  </div>
                </div>

                {/* Amenities */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-2">
                    {hall.amenities.slice(0, 6).map((amenityId) => {
                      const amenity = availableAmenities.find(a => a.id === amenityId)
                      return (
                        <span
                          key={amenityId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          title={amenity?.label}
                        >
                          <span>{getAmenityIcon(amenityId)}</span>
                          <span>{amenity?.label}</span>
                        </span>
                      )
                    })}
                    {hall.amenities.length > 6 && (
                      <span className="text-xs text-gray-500">
                        +{hall.amenities.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedHall(hall)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                    {hall.status === 'available' && hasPermission('banquets:create') && (
                      <button
                        onClick={() => handleBookHall(hall)}
                        className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <Calendar className="h-4 w-4" />
                        Book Now
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPermission('banquets:edit') && (
                      <button
                        onClick={() => {
                          setEditingHall(hall)
                          setShowEditHall(true)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('banquets:delete') && (
                      <button
                        onClick={() => {
                          // TODO: Implement delete functionality
                          showNotification('info', 'Delete functionality will be implemented')
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredHalls.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No banquet halls found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Hall Details Modal - Placeholder */}
        {selectedHall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedHall.name}</h2>
                  <button
                    onClick={() => setSelectedHall(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-gray-600 mb-4">{selectedHall.description}</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="font-medium">Capacity:</span> {selectedHall.capacity} guests
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> ₹{selectedHall.price.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Floor:</span> {selectedHall.floor}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedHall.status)}`}>
                      {selectedHall.status.charAt(0).toUpperCase() + selectedHall.status.slice(1)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHall(null)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Modal */}
        {showCalendar && bookingHall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Select Dates for {bookingHall.name}</h2>
                  <button
                    onClick={() => {
                      setShowCalendar(false)
                      setBookingHall(null)
                      setSelectedDates(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-lg font-semibold">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                  
                  {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                    <div key={`empty-${i}`} className="p-2"></div>
                  ))}
                  
                  {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)
                    const canSelect = canSelectDate(date, bookingHall.id)
                    const isSelected = selectedDates && 
                      formatDate(date) >= selectedDates.start && 
                      formatDate(date) <= selectedDates.end
                    const isBooked = isDateBooked(date, bookingHall.id)
                    
                    return (
                      <button
                        key={i + 1}
                        onClick={() => handleDateSelect(date)}
                        disabled={!canSelect}
                        className={`p-2 text-center text-sm rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : isBooked
                            ? 'bg-red-100 text-red-500 cursor-not-allowed'
                            : canSelect
                            ? 'hover:bg-blue-100 text-gray-900'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Dates Display */}
                {selectedDates && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">Selected Dates:</h4>
                    <p className="text-blue-700">
                      {selectedDates.start === selectedDates.end
                        ? new Date(selectedDates.start).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : `${new Date(selectedDates.start).toLocaleDateString()} - ${new Date(selectedDates.end).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowCalendar(false)
                      setBookingHall(null)
                      setSelectedDates(null)
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProceedToBooking}
                    disabled={!selectedDates}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Proceed to Booking
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Form Modal */}
        {showBookingForm && bookingHall && selectedDates && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Book {bookingHall.name}</h2>
                  <button
                    onClick={() => {
                      setShowBookingForm(false)
                      setBookingHall(null)
                      setSelectedDates(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Event Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                      <input
                        type="text"
                        value={bookingForm.eventName}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, eventName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter event name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
                      <select
                        value={bookingForm.eventType}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, eventType: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="wedding">Wedding</option>
                        <option value="corporate">Corporate Event</option>
                        <option value="party">Party/Celebration</option>
                        <option value="conference">Conference/Seminar</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={bookingForm.startTime}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, startTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={bookingForm.endTime}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, endTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expected Guests *</label>
                      <input
                        type="number"
                        min="1"
                        max={bookingHall.capacity}
                        value={bookingForm.expectedGuests}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, expectedGuests: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Max ${bookingHall.capacity} guests`}
                      />
                    </div>
                  </div>

                  {/* Client Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Client Details</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                      <input
                        type="text"
                        value={bookingForm.clientName}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, clientName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter client name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={bookingForm.clientPhone}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={bookingForm.clientEmail}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter email address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea
                        value={bookingForm.clientAddress}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, clientAddress: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter client address"
                      />
                    </div>
                  </div>
                </div>

                {/* Services Required */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Services</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'cateringRequired', label: 'Catering' },
                      { key: 'decorationRequired', label: 'Decoration' },
                      { key: 'soundSystemRequired', label: 'Sound System' },
                      { key: 'photographyRequired', label: 'Photography' }
                    ].map(service => (
                      <label key={service.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={bookingForm[service.key as keyof typeof bookingForm] as boolean}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, [service.key]: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{service.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900">
                      ₹{bookingHall.price.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount</label>
                    <input
                      type="number"
                      min="0"
                      max={bookingHall.price}
                      value={bookingForm.advanceAmount}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, advanceAmount: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={bookingForm.paymentMethod}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Special Requirements */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                  <textarea
                    value={bookingForm.specialRequirements}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, specialRequirements: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any special requirements or notes..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowBookingForm(false)
                      setBookingHall(null)
                      setSelectedDates(null)
                    }}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookingSubmit}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Confirm Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookings List Modal */}
        {showBookings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Banquet Bookings</h2>
                  <button
                    onClick={() => setShowBookings(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hall</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.hallName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="font-medium">{b.clientName}</div>
                            <div className="text-gray-500 text-xs">{b.clientPhone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {b.startDate} → {b.endDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.expectedGuests}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{b.totalAmount.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={async () => {
                                try {
                                  await banquetsAPI.deleteBooking(b.id)
                                  setBookings(prev => prev.filter(x => x.id !== b.id))
                                  showNotification('success', 'Booking deleted')
                                } catch {
                                  showNotification('error', 'Failed to delete booking')
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {bookings.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-center text-sm text-gray-500" colSpan={6}>No bookings found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Notification
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      </div>
    </div>
  )
}

export default Banquets
