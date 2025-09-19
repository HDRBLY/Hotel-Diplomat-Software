import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import Notification, { useNotification } from '../components/Notification'
import { io, Socket } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
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
  ArrowRight,
  Search
} from 'lucide-react'

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
  advancePaymentDate?: string
  balanceAmount: number
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'pending'
  cateringRequired: boolean
  decorationRequired: boolean
  soundSystemRequired: boolean
  photographyRequired: boolean
  projectorRequired: boolean
  specialRequirements: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'tentative'
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
  const [socket, setSocket] = useState<Socket | null>(null)
  
  // Booking related states
  const [showCalendar, setShowCalendar] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedDates, setSelectedDates] = useState<{start: string, end: string} | null>(null)
  const [bookingHall, setBookingHall] = useState<BanquetHall | null>(null)
  const [showBookings, setShowBookings] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingBooking, setEditingBooking] = useState<BanquetBooking | null>(null)
  const [showEditBooking, setShowEditBooking] = useState(false)
  const [deletingBooking, setDeletingBooking] = useState<string | null>(null)
  
  // Search and filter states for bookings
  const [bookingSearchTerm, setBookingSearchTerm] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all')
  const [bookingDateFilter, setBookingDateFilter] = useState('all')
  const [bookingHallFilter, setBookingHallFilter] = useState('all')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedFilterDate, setSelectedFilterDate] = useState<Date | null>(null)
  
  // Enhanced calendar states
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [calendarView, setCalendarView] = useState<'calendar' | 'month' | 'year'>('calendar')
  
  // Booking form state
  const [bookingForm, setBookingForm] = useState<{
    eventName: string
    clientName: string
    clientEmail: string
    clientPhone: string
    clientAddress: string
    eventType: 'wedding' | 'corporate' | 'party' | 'conference' | 'other'
    startTime: string
    endTime: string
    expectedGuests: number
    advanceAmount: number
    advancePaymentDate: string
    paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'pending'
    cateringRequired: boolean
    decorationRequired: boolean
    soundSystemRequired: boolean
    photographyRequired: boolean
    projectorRequired: boolean
    specialRequirements: string
    notes: string
  }>({
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
    advancePaymentDate: '',
    paymentMethod: 'cash',
    cateringRequired: false,
    decorationRequired: false,
    soundSystemRequired: false,
    photographyRequired: false,
    projectorRequired: false,
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

  // Fetch halls and bookings from backend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch banquet halls
        const hallsResponse = await fetch(`${BACKEND_URL}/api/halls`)
        if (hallsResponse.ok) {
          const hallsData = await hallsResponse.json()
          if (hallsData.success) {
            setHalls(hallsData.data || [])
          } else {
            setHalls(defaultHalls) // Fallback to default data
          }
        } else {
          console.error('Failed to fetch halls')
          setHalls(defaultHalls) // Fallback to default data
        }
        
        // Fetch banquet bookings
        const bookingsResponse = await fetch(`${BACKEND_URL}/api/banquet-bookings`)
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json()
          if (bookingsData.success) {
            setBookings(bookingsData.data || [])
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data'
        setError(errorMessage)
        setHalls(defaultHalls) // Fallback to default data
        showNotification('error', `Failed to fetch data: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Setup WebSocket connection for real-time updates
    const newSocket = io(BACKEND_URL)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      // Connected to backend for real-time banquet updates
    })

    newSocket.on('banquet_booking_created', (newBooking) => {
      setBookings(prev => [newBooking, ...prev])
    })

    newSocket.on('banquet_booking_updated', (updatedBooking) => {
      setBookings(prev => prev.map(booking => 
        booking.id === updatedBooking.id ? updatedBooking : booking
      ))
    })

    newSocket.on('banquet_booking_deleted', (data) => {
      setBookings(prev => prev.filter(booking => booking.id !== data.id))
    })

    // Hall-related socket events
    newSocket.on('hall_created', (newHall) => {
      setHalls(prev => [newHall, ...prev])
    })

    newSocket.on('hall_updated', (updatedHall) => {
      setHalls(prev => prev.map(hall => 
        hall.id === updatedHall.id ? updatedHall : hall
      ))
    })

    newSocket.on('hall_deleted', (data) => {
      setHalls(prev => prev.filter(hall => hall.id !== data.id))
    })

    newSocket.on('activity_updated', (activity) => {
      // Handle activity updates if needed
      // Activity updated
    })

    return () => {
      if (newSocket) {
        newSocket.disconnect()
        newSocket.removeAllListeners()
      }
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

  // Filter bookings based on search and filters
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.eventName.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      booking.clientName.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      booking.clientPhone.includes(bookingSearchTerm) ||
      booking.clientEmail.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      booking.hallName.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      booking.id.includes(bookingSearchTerm)
    
    const matchesStatus = bookingStatusFilter === 'all' || booking.status === bookingStatusFilter
    const matchesHall = bookingHallFilter === 'all' || booking.hallId === bookingHallFilter
    
    let matchesDate = true
    if (selectedFilterDate) {
      const bookingDate = new Date(booking.startDate)
      matchesDate = bookingDate.toDateString() === selectedFilterDate.toDateString()
    } else if (bookingDateFilter !== 'all') {
      const today = new Date()
      const bookingDate = new Date(booking.startDate)
      
      switch (bookingDateFilter) {
        case 'today':
          matchesDate = bookingDate.toDateString() === today.toDateString()
          break
        case 'this_week':
          const weekStart = new Date(today.setDate(today.getDate() - today.getDay()))
          const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6))
          matchesDate = bookingDate >= weekStart && bookingDate <= weekEnd
          break
        case 'this_month':
          matchesDate = bookingDate.getMonth() === today.getMonth() && bookingDate.getFullYear() === today.getFullYear()
          break
        case 'upcoming':
          matchesDate = bookingDate >= today
          break
        case 'past':
          matchesDate = bookingDate < today
          break
      }
    }
    
    return matchesSearch && matchesStatus && matchesHall && matchesDate
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

  // Enhanced calendar functions
  const getMonthName = (monthIndex: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[monthIndex]
  }

  const getYearRange = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear; i <= currentYear + 5; i++) {
      years.push(i)
    }
    return years
  }

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex))
    setCalendarView('calendar')
  }

  const handleYearSelect = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth()))
    setCalendarView('calendar')
  }

  const handleCalendarHeaderClick = () => {
    if (calendarView === 'calendar') {
      setCalendarView('month')
    } else if (calendarView === 'month') {
      setCalendarView('year')
    }
  }

  // Booking handlers
  const handleBookHall = (hall: BanquetHall) => {
    setBookingHall(hall)
    setShowCalendar(true)
    setCurrentMonth(new Date())
    setSelectedDate(null)
    setSelectedDates(null)
    setCalendarView('calendar')
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
      advanceAmount: Math.round(bookingHall.price * 0.3) // 30% advance
    }))
  }

  const handleBookingSubmit = async () => {
    if (!selectedDates || !bookingHall || !user) return
    
    // Validation
    if (!bookingForm.eventName || !bookingForm.clientName || !bookingForm.clientPhone) {
      showNotification('error', 'Please fill in all required fields')
      return
    }
    
    const newBooking: BanquetBooking = {
      id: Date.now().toString(),
      hallId: bookingHall.id,
      hallName: bookingHall.name,
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
      guestCount: bookingForm.expectedGuests,
      expectedGuests: bookingForm.expectedGuests,
      totalAmount: bookingHall.price,
      advanceAmount: bookingForm.advanceAmount,
      advancePaymentDate: bookingForm.advancePaymentDate,
      balanceAmount: bookingHall.price - bookingForm.advanceAmount,
      paymentMethod: bookingForm.paymentMethod,
      cateringRequired: bookingForm.cateringRequired,
      decorationRequired: bookingForm.decorationRequired,
      soundSystemRequired: bookingForm.soundSystemRequired,
      photographyRequired: bookingForm.photographyRequired,
      projectorRequired: bookingForm.projectorRequired,
      specialRequirements: bookingForm.specialRequirements,
      status: bookingForm.advanceAmount > 0 ? 'confirmed' : 'tentative',
      bookingDate: new Date().toISOString(),
      createdBy: user.name,
      notes: bookingForm.notes
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/banquet-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      })
      
      if (!response.ok) {
        throw new Error('Failed to create booking')
      }
      
      const data = await response.json()
      if (data.success) {
        // Don't update local state here - let socket event handle it to avoid duplicates
        showNotification('success', 'Booking created successfully!')
      } else {
        throw new Error(data.message || 'Failed to create booking')
      }
      
      // Reset form
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
        advancePaymentDate: '',
        paymentMethod: 'cash',
        cateringRequired: false,
        decorationRequired: false,
        soundSystemRequired: false,
        photographyRequired: false,
        projectorRequired: false,
        specialRequirements: '',
        notes: ''
      })
      
      setShowBookingForm(false)
      setSelectedDates(null)
      setBookingHall(null)
      
    } catch (error) {
      console.error('Error creating booking:', error)
      showNotification('error', 'Failed to create booking. Please try again.')
    }
  }

  // Handle edit booking
  const handleEditBooking = (booking: BanquetBooking) => {
    setEditingBooking(booking)
    setBookingForm({
      eventName: booking.eventName,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      clientPhone: booking.clientPhone,
      clientAddress: booking.clientAddress,
      eventType: booking.eventType,
      startTime: booking.startTime,
      endTime: booking.endTime,
      expectedGuests: booking.expectedGuests,
      advanceAmount: booking.advanceAmount,
      advancePaymentDate: booking.advancePaymentDate || '',
      paymentMethod: booking.paymentMethod,
      cateringRequired: booking.cateringRequired,
      decorationRequired: booking.decorationRequired,
      soundSystemRequired: booking.soundSystemRequired,
      photographyRequired: booking.photographyRequired,
      projectorRequired: booking.projectorRequired || false,
      specialRequirements: booking.specialRequirements,
      notes: booking.notes
    })
    setShowEditBooking(true)
  }

  // Handle update booking
  const handleUpdateBooking = async () => {
    if (!editingBooking) return

    const updatedBooking = {
      ...editingBooking,
      ...bookingForm,
      totalAmount: editingBooking.totalAmount, // Keep original total
      balanceAmount: editingBooking.totalAmount - bookingForm.advanceAmount,
      status: bookingForm.advanceAmount > 0 ? 'confirmed' : 'tentative',
      updatedAt: new Date().toISOString()
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/banquet-bookings/${editingBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBooking)
      })

      if (!response.ok) {
        throw new Error('Failed to update booking')
      }

      const data = await response.json()
      if (data.success) {
        setBookings(prev => prev.map(booking => 
          booking.id === editingBooking.id ? data.data : booking
        ))
        showNotification('success', 'Booking updated successfully!')
        setShowEditBooking(false)
        setEditingBooking(null)
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
          advancePaymentDate: '',
          paymentMethod: 'cash',
          cateringRequired: false,
          decorationRequired: false,
          soundSystemRequired: false,
          photographyRequired: false,
          projectorRequired: false,
          specialRequirements: '',
          notes: ''
        })
      } else {
        throw new Error(data.message || 'Failed to update booking')
      }
    } catch (error) {
      console.error('Error updating booking:', error)
      showNotification('error', 'Failed to update booking. Please try again.')
    }
  }

  // Handle delete booking
  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return
    }

    setDeletingBooking(bookingId)
    try {
      const response = await fetch(`${BACKEND_URL}/api/banquet-bookings/${bookingId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete booking')
      }

      const data = await response.json()
      if (data.success) {
        setBookings(prev => prev.filter(booking => booking.id !== bookingId))
        showNotification('success', 'Booking deleted successfully!')
      } else {
        throw new Error(data.message || 'Failed to delete booking')
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      showNotification('error', 'Failed to delete booking. Please try again.')
    } finally {
      setDeletingBooking(null)
    }
  }

  // Handle edit hall
  const handleEditHall = (hall: BanquetHall) => {
    setEditingHall(hall)
    setShowEditHall(true)
  }

  // Handle update hall
  const handleUpdateHall = async () => {
    if (!editingHall) return

    try {
      const response = await fetch(`${BACKEND_URL}/api/halls/${editingHall.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingHall),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Update local state with the response data
          setHalls(prev => prev.map(hall => 
            hall.id === editingHall.id ? result.data : hall
          ))
          showNotification('success', 'Hall updated successfully!')
          setShowEditHall(false)
          setEditingHall(null)
        } else {
          showNotification('error', result.message || 'Failed to update hall')
        }
      } else {
        const errorData = await response.json()
        showNotification('error', errorData.message || 'Failed to update hall')
      }
    } catch (error) {
      console.error('Error updating hall:', error)
      showNotification('error', 'Failed to update hall. Please try again.')
    }
  }

  // Handle delete hall
  const handleDeleteHall = async (hallId: string) => {
    if (!confirm('Are you sure you want to delete this hall? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/halls/${hallId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Update local state
          setHalls(prev => prev.filter(hall => hall.id !== hallId))
          showNotification('success', 'Hall deleted successfully!')
        } else {
          showNotification('error', result.message || 'Failed to delete hall')
        }
      } else {
        const errorData = await response.json()
        showNotification('error', errorData.message || 'Failed to delete hall')
      }
    } catch (error) {
      console.error('Error deleting hall:', error)
      showNotification('error', 'Failed to delete hall. Please try again.')
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
                        onClick={() => handleEditHall(hall)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit hall"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {hasPermission('banquets:delete') && (
                      <button
                        onClick={() => handleDeleteHall(hall.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete hall"
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
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedHall(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
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

        {/* Edit Hall Modal */}
        {showEditHall && editingHall && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowEditHall(false)
              setEditingHall(null)
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Hall - {editingHall.name}</h2>
                  <button
                    onClick={() => {
                      setShowEditHall(false)
                      setEditingHall(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hall Name *</label>
                      <input
                        type="text"
                        value={editingHall.name}
                        onChange={(e) => setEditingHall(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter hall name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <textarea
                        value={editingHall.description}
                        onChange={(e) => setEditingHall(prev => prev ? { ...prev, description: e.target.value } : null)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter hall description"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                        <input
                          type="number"
                          min="1"
                          value={editingHall.capacity}
                          onChange={(e) => setEditingHall(prev => prev ? { ...prev, capacity: parseInt(e.target.value) || 0 } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter capacity"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price per Event *</label>
                        <input
                          type="number"
                          min="0"
                          value={editingHall.price}
                          onChange={(e) => setEditingHall(prev => prev ? { ...prev, price: parseInt(e.target.value) || 0 } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter price"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                        <select
                          value={editingHall.type}
                          onChange={(e) => setEditingHall(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="grand">Grand Hall</option>
                          <option value="ballroom">Ballroom</option>
                          <option value="pavilion">Pavilion</option>
                          <option value="conference">Conference Room</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Floor *</label>
                        <input
                          type="number"
                          min="0"
                          value={editingHall.floor}
                          onChange={(e) => setEditingHall(prev => prev ? { ...prev, floor: parseInt(e.target.value) || 0 } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter floor number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Amenities</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {availableAmenities.map(amenity => (
                        <label key={amenity.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editingHall.amenities.includes(amenity.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingHall(prev => prev ? {
                                  ...prev,
                                  amenities: [...prev.amenities, amenity.id]
                                } : null)
                              } else {
                                setEditingHall(prev => prev ? {
                                  ...prev,
                                  amenities: prev.amenities.filter(id => id !== amenity.id)
                                } : null)
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{amenity.label}</span>
                        </label>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={editingHall.status}
                        onChange={(e) => setEditingHall(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="available">Available</option>
                        <option value="maintenance">Under Maintenance</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowEditHall(false)
                      setEditingHall(null)
                    }}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateHall}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Update Hall
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Bookings Modal */}
        {showBookings && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowBookings(false)}
          >
            <div 
              className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Banquet Bookings ({filteredBookings.length})</h2>
                  <button
                    onClick={() => setShowBookings(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Status Summary */}
                <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{bookings.length}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{bookings.filter(b => b.status === 'confirmed').length}</div>
                    <div className="text-sm text-gray-600">Confirmed</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600">{bookings.filter(b => b.status === 'tentative').length}</div>
                    <div className="text-sm text-gray-600">Tentative</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">{bookings.filter(b => b.status === 'pending').length}</div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">{bookings.filter(b => b.status === 'cancelled').length}</div>
                    <div className="text-sm text-gray-600">Cancelled</div>
                  </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="mb-6 space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search by event name, client name, phone, email, hall name, or booking ID..."
                      value={bookingSearchTerm}
                      onChange={(e) => setBookingSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Filter Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={bookingStatusFilter}
                        onChange={(e) => setBookingStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="tentative">Tentative</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDatePicker(true)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                        >
                          <Calendar className="h-4 w-4" />
                          {selectedFilterDate 
                            ? selectedFilterDate.toLocaleDateString() 
                            : 'Select Date'
                          }
                        </button>
                        {selectedFilterDate && (
                          <button
                            onClick={() => {
                              setSelectedFilterDate(null)
                              setBookingDateFilter('all')
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Clear date filter"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hall Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hall</label>
                      <select
                        value={bookingHallFilter}
                        onChange={(e) => setBookingHallFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Halls</option>
                        {halls.map(hall => (
                          <option key={hall.id} value={hall.id}>{hall.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setBookingSearchTerm('')
                          setBookingStatusFilter('all')
                          setBookingDateFilter('all')
                          setBookingHallFilter('all')
                          setSelectedFilterDate(null)
                        }}
                        className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {bookings.length === 0 ? 'No bookings found' : 'No bookings match your filters'}
                    </h3>
                    <p className="text-gray-600">
                      {bookings.length === 0 
                        ? 'No banquet bookings have been made yet.' 
                        : 'Try adjusting your search criteria or clear filters.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Event Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hall & Dates
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{booking.eventName}</div>
                                <div className="text-sm text-gray-500">{booking.eventType}</div>
                                <div className="text-sm text-gray-500">{booking.expectedGuests} guests</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{booking.clientName}</div>
                                <div className="text-sm text-gray-500">{booking.clientPhone}</div>
                                <div className="text-sm text-gray-500">{booking.clientEmail}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{booking.hallName}</div>
                                <div className="text-sm text-gray-500">
                                  {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {booking.startTime} - {booking.endTime}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">₹{booking.totalAmount.toLocaleString()}</div>
                                <div className="text-sm text-gray-500">Advance: ₹{booking.advanceAmount.toLocaleString()}</div>
                                <div className="text-xs text-gray-400">Method: {booking.paymentMethod.toUpperCase()}</div>
                                {booking.advancePaymentDate && (
                                  <div className="text-xs text-gray-400">Due: {new Date(booking.advancePaymentDate).toLocaleDateString()}</div>
                                )}
                                <div className="text-sm text-gray-500">Balance: ₹{booking.balanceAmount.toLocaleString()}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                booking.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-800'
                                  : booking.status === 'tentative'
                                  ? 'bg-orange-100 text-orange-800'
                                  : booking.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : booking.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditBooking(booking)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                  title="Edit booking"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBooking(booking.id)}
                                  disabled={deletingBooking === booking.id}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete booking"
                                >
                                  {deletingBooking === booking.id ? (
                                    <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Booking Modal */}
        {showEditBooking && editingBooking && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowEditBooking(false)
              setEditingBooking(null)
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Booking - {editingBooking.eventName}</h2>
                  <button
                    onClick={() => {
                      setShowEditBooking(false)
                      setEditingBooking(null)
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
                        max={halls.find(h => h.id === editingBooking.hallId)?.capacity || 1000}
                        value={bookingForm.expectedGuests}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, expectedGuests: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter expected guests"
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { key: 'cateringRequired', label: 'Catering' },
                      { key: 'decorationRequired', label: 'Decoration' },
                      { key: 'soundSystemRequired', label: 'Sound System' },
                      { key: 'photographyRequired', label: 'Photography' },
                      { key: 'projectorRequired', label: 'Projector Setup' }
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
                      ₹{editingBooking.totalAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount</label>
                    <input
                      type="number"
                      min="0"
                      max={editingBooking.totalAmount}
                      value={bookingForm.advanceAmount}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, advanceAmount: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {bookingForm.advanceAmount > 0 ? '✅ Booking will be confirmed' : '⚠️ Booking will be tentative (no advance paid)'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment Date</label>
                    <input
                      type="date"
                      value={bookingForm.advancePaymentDate}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, advancePaymentDate: e.target.value }))}
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

                {/* Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowEditBooking(false)
                      setEditingBooking(null)
                    }}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateBooking}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Update Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date Picker Modal for Filtering */}
        {showDatePicker && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDatePicker(false)}
          >
            <div 
              className="bg-white rounded-lg max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Select Date to Filter Bookings</h2>
                  <button
                    onClick={() => setShowDatePicker(false)}
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
                    const isSelected = selectedFilterDate && 
                      date.toDateString() === selectedFilterDate.toDateString()
                    const hasBookings = bookings.some(booking => {
                      const bookingDate = new Date(booking.startDate)
                      return bookingDate.toDateString() === date.toDateString()
                    })
                    
                    return (
                      <button
                        key={i + 1}
                        onClick={() => {
                          setSelectedFilterDate(date)
                          setShowDatePicker(false)
                        }}
                        className={`p-2 text-center text-sm rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : hasBookings
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'hover:bg-blue-100 text-gray-900'
                        }`}
                      >
                        {i + 1}
                        {hasBookings && !isSelected && (
                          <div className="w-1 h-1 bg-green-600 rounded-full mx-auto mt-1"></div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Date Display */}
                {selectedFilterDate && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">Selected Date:</h4>
                    <p className="text-blue-700">
                      {selectedFilterDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      {bookings.filter(booking => {
                        const bookingDate = new Date(booking.startDate)
                        return bookingDate.toDateString() === selectedFilterDate.toDateString()
                      }).length} booking(s) found
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFilterDate(null)
                      setShowDatePicker(false)
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Clear Date
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Modal */}
        {showCalendar && bookingHall && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowCalendar(false)
              setBookingHall(null)
              setSelectedDates(null)
              setCalendarView('calendar')
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Select Dates for {bookingHall.name}</h2>
                  <button
                    onClick={() => {
                      setShowCalendar(false)
                      setBookingHall(null)
                      setSelectedDates(null)
                      setCalendarView('calendar')
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
                  <button
                    onClick={handleCalendarHeaderClick}
                    className="px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors text-lg font-semibold"
                  >
                    {calendarView === 'calendar' && currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    {calendarView === 'month' && getMonthName(currentMonth.getMonth())}
                    {calendarView === 'year' && currentMonth.getFullYear()}
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Month Picker View */}
                {calendarView === 'month' && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {Array.from({ length: 12 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => handleMonthSelect(i)}
                        className={`p-3 text-center text-sm font-medium rounded-lg transition-colors ${
                          i === currentMonth.getMonth()
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 text-gray-900'
                        }`}
                      >
                        {getMonthName(i)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Year Picker View */}
                {calendarView === 'year' && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {getYearRange().map(year => (
                      <button
                        key={year}
                        onClick={() => handleYearSelect(year)}
                        className={`p-3 text-center text-sm font-medium rounded-lg transition-colors ${
                          year === currentMonth.getFullYear()
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 text-gray-900'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}

                {/* Calendar Grid */}
                {calendarView === 'calendar' && (
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
                )}

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
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowBookingForm(false)
              setBookingHall(null)
              setSelectedDates(null)
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { key: 'cateringRequired', label: 'Catering' },
                      { key: 'decorationRequired', label: 'Decoration' },
                      { key: 'soundSystemRequired', label: 'Sound System' },
                      { key: 'photographyRequired', label: 'Photography' },
                      { key: 'projectorRequired', label: 'Projector Setup' }
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
                    <p className="text-xs text-gray-500 mt-1">
                      {bookingForm.advanceAmount > 0 ? '✅ Booking will be confirmed' : '⚠️ Booking will be tentative (no advance paid)'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment Date</label>
                    <input
                      type="date"
                      value={bookingForm.advancePaymentDate}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, advancePaymentDate: e.target.value }))}
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
