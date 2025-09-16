import { useState, useEffect } from 'react'
import { guestsAPI, roomsAPI, billingAPI } from '../services/api'
import { io, Socket } from 'socket.io-client'
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Mail, 
  MapPin,
  CheckCircle,
  Clock,
  User,
  X,
  Calendar
} from 'lucide-react'
import Notification, { useNotification } from '../components/Notification'
import { useAuth } from '../components/AuthContext'
import { formatTodayISO, formatToDDMMYYYY, parseFlexibleDate } from '../utils/date'
import { calculateBill, numberToIndianWords, getDisplaySafeValues, formatBillDates } from '../utils/billing'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Define GuestCategory type for type safety
export type GuestCategory = 'couple' | 'corporate' | 'solo' | 'family'

interface Guest {
  id: string
  name: string
  email: string
  phone: string
  roomNumber: string
  checkInDate: string
  checkOutDate: string
  status: 'checked-in' | 'checked-out' | 'reserved'
  totalAmount: number
  paidAmount: number
  address: string
  idProof: string
  category: GuestCategory
  plan: 'EP' | 'CP' | 'MAP' | 'AP'
  complimentary?: boolean
  secondaryGuest?: {
    name: string
    phone?: string
    idProof?: string
    idProofType: string
  }
  extraBeds?: Array<{
    name: string
    phone?: string
    idProof?: string
    idProofType: string
    charge: number
  }>
  createdAt?: string
  updatedAt?: string
}

const Guests = () => {
  const { hasPermission } = useAuth()
  const [guests, setGuests] = useState<Guest[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutGuest, setCheckoutGuest] = useState<Guest | null>(null)
  const [showConfirmCheckout, setShowConfirmCheckout] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [editMenuGuestId, setEditMenuGuestId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    name: string
    email: string
    phone: string
    address: string
    idProof: string
    idProofType: string
    secondaryGuest?: {
      name: string
      phone?: string
      idProof?: string
      idProofType: string
    }
    extraBeds: Array<{
      name: string
      phone?: string
      idProof?: string
      idProofType: string
      charge: number
    }>
  }>({
    name: '',
    email: '',
    phone: '',
    address: '',
    idProof: '',
    idProofType: '',
    secondaryGuest: undefined,
    extraBeds: []
  })
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutDetails, setCheckoutDetails] = useState({
    actualCheckOutDate: '',
    finalAmount: 0,
    additionalCharges: 0,
    laundryCharges: 0,
    halfDayCharges: 0,
    paymentMethod: 'CASH',
    notes: ''
  })
  const [showCheckInCalendar, setShowCheckInCalendar] = useState(false)
  const [showCheckOutCalendar, setShowCheckOutCalendar] = useState(false)
  const [showCheckoutModalCalendar, setShowCheckoutModalCalendar] = useState(false)
  const [showSecondaryGuest, setShowSecondaryGuest] = useState(false)
  const [extraBeds, setExtraBeds] = useState<Array<{
    name: string
    phone?: string
    idProof?: string
    idProofType: string
    charge: number
  }>>([])
  const { notification, showNotification, hideNotification } = useNotification()
  const [newGuest, setNewGuest] = useState<{
    name: string
    email: string
    phone: string
    roomNumber: string
    checkInDate: string
    checkOutDate: string
    totalAmount: number
    paidAmount: number
    address: string
    idProof: string
    idProofType: string
    category: GuestCategory
    plan: 'EP' | 'CP' | 'MAP' | 'AP'
    complimentary?: boolean
    secondaryGuest?: {
      name: string
      phone?: string
      idProof?: string
      idProofType: string
    }
    extraBeds?: Array<{
      name: string
      phone?: string
      idProof?: string
      idProofType: string
      charge: number
    }>
  }>(
    {
      name: '',
      email: '',
      phone: '',
      roomNumber: '',
      checkInDate: '',
      checkOutDate: '',
      totalAmount: 0,
      paidAmount: 0,
      address: '',
      idProof: '',
      idProofType: 'AADHAR',
      category: 'couple',
      plan: 'EP',
      complimentary: false,
      secondaryGuest: undefined
    }
  )

  const recalculateTotals = (guestBaseAmount: number, beds: Array<{ charge: number }>) => {
    const extraBedsTotal = beds.reduce((sum, b) => sum + (Number(b.charge) || 0), 0)
    return {
      extraBedsTotal,
      totalAmount: Math.max(0, Math.round(guestBaseAmount + extraBedsTotal))
    }
  }

  // Format currency as per Indian locale
  const formatINR = (amount: number): string => {
    try {
      return (Number(amount) || 0).toLocaleString('en-IN')
    } catch {
      return String(amount || 0)
    }
  }

  // Convert number to words using Indian numbering (Lakh/Crore)
  const numberToIndianWords = (amount: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

    const toWordsBelowThousand = (num: number): string => {
      let str = ''
      if (num >= 100) {
        str += ones[Math.floor(num / 100)] + ' HUNDRED'
        num = num % 100
        if (num > 0) str += ' AND '
      }
      if (num >= 20) {
        str += tens[Math.floor(num / 10)]
        if (num % 10) str += ' ' + ones[num % 10]
      } else if (num > 0) {
        str += ones[num]
      }
      return str
    }

    const n = Math.round(Number(amount) || 0)
    if (n === 0) return 'ZERO'

    const crore = Math.floor(n / 10000000)
    const lakh = Math.floor((n % 10000000) / 100000)
    const thousand = Math.floor((n % 100000) / 1000)
    const hundredBelow = n % 1000

    let words = ''
    if (crore) words += toWordsBelowThousand(crore) + ' CRORE '
    if (lakh) words += toWordsBelowThousand(lakh) + ' LAKH '
    if (thousand) words += toWordsBelowThousand(thousand) + ' THOUSAND '
    if (hundredBelow) words += toWordsBelowThousand(hundredBelow)
    return words.trim()
  }

  const handleEditExtraBedChange = (index: number, field: string, value: string) => {
    setEditForm(prev => {
      const updated = { ...prev }
      updated.extraBeds = [...(prev.extraBeds || [])]
      const bed = { ...(updated.extraBeds[index] || { name: '', charge: 0 }) }
      ;(bed as any)[field] = field === 'charge' ? Number(value) || 0 : value
      updated.extraBeds[index] = bed
      return updated
    })
  }

  const addEditExtraBed = () => {
    setEditForm(prev => ({
      ...prev,
      extraBeds: [...(prev.extraBeds || []), { name: '', charge: 0, idProofType: '' }]
    }))
  }

  const removeEditExtraBed = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      extraBeds: (prev.extraBeds || []).filter((_, i) => i !== index)
    }))
  }

  const handleSaveEditGuest = async () => {
    if (!editGuest) return

    // Keep paidAmount and balance unchanged; only adjust totalAmount based on extra beds
    const baseRoomAmount = (editGuest.totalAmount || 0) - (editGuest.extraBeds?.reduce((s, b) => s + (b.charge || 0), 0) || 0)
    const { totalAmount } = recalculateTotals(baseRoomAmount, editForm.extraBeds || [])

    try {
      const response = await guestsAPI.updateGuest(editGuest.id, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
          idProof: editForm.idProof,
          idProofType: editForm.idProofType,
          secondaryGuest: editForm.secondaryGuest,
          extraBeds: editForm.extraBeds,
          totalAmount: totalAmount
      })

      if (response.success) {
        showNotification('success', 'Guest details updated successfully!')
        setEditGuest(null)
        // Refresh list
        const guestsRes = await guestsAPI.getAllGuests()
        if (guestsRes.success) setGuests(guestsRes.data || [])
      } else {
        showNotification('error', 'Failed to update guest. Please try again.')
      }
    } catch (error) {
      console.error('Error updating guest:', error)
      showNotification('error', 'Failed to update guest. Please try again.')
    }
  }

  // Fetch guests and rooms from backend and setup WebSocket
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch guests
        const guestsRes = await guestsAPI.getAllGuests()
        if (!guestsRes.success) throw new Error('Failed to fetch guests data')
        setGuests(guestsRes.data || [])

        // Fetch rooms
        const roomsRes = await roomsAPI.getAllRooms()
        if (!roomsRes.success) throw new Error('Failed to fetch rooms data')
        setRooms(roomsRes.data || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data'
        setError(errorMessage)
        setGuests([])
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
      console.log('Connected to backend for real-time guest updates')
    })

    newSocket.on('guest_updated', (updatedGuest) => {
      setGuests(prev => prev.map(guest => 
        guest.id === updatedGuest.id ? updatedGuest : guest
      ))
    })

    newSocket.on('guest_created', (newGuest) => {
      setGuests(prev => [newGuest, ...prev])
    })

    newSocket.on('room_updated', () => {
      // Refresh guests list when room status changes
      fetchData()
    })

    newSocket.on('room_shifted', (shiftData) => {
      console.log('Received room_shifted event in Guests:', shiftData)
      // Refresh guests list when a room shift happens
      fetchData()
    })

    return () => {
      if (newSocket) {
        newSocket.disconnect()
        newSocket.removeAllListeners()
      }
    }
  }, [])

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.secondaryGuest?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (guest.extraBeds && guest.extraBeds.some(bed => bed.name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                         guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.roomNumber.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || guest.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    // Sort by creation date (id) first, then by check-in date
    const aId = parseInt(a.id) || 0
    const bId = parseInt(b.id) || 0
    if (aId !== bId) {
      return bId - aId // Newest created first
    }
    return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime() // Then by check-in date
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked-in':
        return 'text-green-600 bg-green-100'
      case 'checked-out':
        return 'text-gray-600 bg-gray-100'
      case 'reserved':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked-in':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'checked-out':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'reserved':
        return <User className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  // Get available rooms for dropdown
  const getAvailableRooms = () => {
    return rooms.filter(room => room.status === 'available').sort((a, b) => a.number.localeCompare(b.number))
  }

  // Date validation functions
  const validateDate = (dateString: string): boolean => {
    if (!dateString) return true // Allow empty dates
    
    // Check if it's a valid date format (dd-mm-yyyy)
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(19|20)\d{2}$/
    if (!dateRegex.test(dateString)) return false
    
    const [day, month, year] = dateString.split('-').map(Number)
    
    // Check if date is valid
    const date = new Date(year, month - 1, day)
    return date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year &&
           year >= 2020 && year <= 2030 // Reasonable year range
  }

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return ''
    
    // If it's already in dd-mm-yyyy format, return as is
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      return dateString
    }
    
    // If it's in yyyy-mm-dd format (from HTML date input), convert
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-')
      return `${day}-${month}-${year}`
    }
    
    return dateString
  }

  const handleDateChange = (field: 'checkInDate' | 'checkOutDate', value: string) => {
    // Remove any non-digit and non-hyphen characters
    const cleanedValue = value.replace(/[^\d-]/g, '')
    
    // Auto-format as user types
    let formattedValue = cleanedValue
    if (cleanedValue.length >= 2 && !cleanedValue.includes('-')) {
      formattedValue = cleanedValue.slice(0, 2) + '-' + cleanedValue.slice(2)
    }
    if (formattedValue.length >= 5 && formattedValue.split('-').length === 2) {
      formattedValue = formattedValue.slice(0, 5) + '-' + formattedValue.slice(5)
    }
    
    // Limit to dd-mm-yyyy format
    if (formattedValue.length > 10) {
      formattedValue = formattedValue.slice(0, 10)
    }
    
    setNewGuest({ ...newGuest, [field]: formattedValue })
  }

  // Convert Indian date format (dd-mm-yyyy) to backend format (yyyy-mm-dd)
  const convertDateToBackendFormat = (dateString: string): string => {
    if (!dateString || !validateDate(dateString)) {
      return new Date().toISOString().split('T')[0] // Return today's date if invalid
    }
    
    const [day, month, year] = dateString.split('-')
    return `${year}-${month}-${day}`
  }

  // Handle checkout date change
  const handleCheckoutDateChange = (value: string) => {
    // Remove any non-digit and non-hyphen characters
    const cleanedValue = value.replace(/[^\d-]/g, '')
    
    // Auto-format as user types
    let formattedValue = cleanedValue
    if (cleanedValue.length >= 2 && !cleanedValue.includes('-')) {
      formattedValue = cleanedValue.slice(0, 2) + '-' + cleanedValue.slice(2)
    }
    if (formattedValue.length >= 5 && formattedValue.split('-').length === 2) {
      formattedValue = formattedValue.slice(0, 5) + '-' + formattedValue.slice(5)
    }
    
    // Limit to dd-mm-yyyy format
    if (formattedValue.length > 10) {
      formattedValue = formattedValue.slice(0, 10)
    }
    
    setCheckoutDetails({ ...checkoutDetails, actualCheckOutDate: formattedValue })
  }

  // Handle calendar date selection
  const handleCalendarDateSelect = (field: 'checkInDate' | 'checkOutDate', date: Date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()
    const formattedDate = `${day}-${month}-${year}`
    
    setNewGuest({ ...newGuest, [field]: formattedDate })
    
    // Close calendar
    if (field === 'checkInDate') {
      setShowCheckInCalendar(false)
    } else {
      setShowCheckOutCalendar(false)
    }
  }

  // Handle checkout modal calendar date selection
  const handleCheckoutCalendarDateSelect = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()
    const formattedDate = `${day}-${month}-${year}`
    
    setCheckoutDetails({ ...checkoutDetails, actualCheckOutDate: formattedDate })
    setShowCheckoutModalCalendar(false)
  }

  // Calendar component
  const CalendarPicker = ({ 
    isOpen, 
    onClose, 
    onDateSelect, 
    minDate 
  }: { 
    isOpen: boolean
    onClose: () => void
    onDateSelect: (date: Date) => void
    minDate?: Date
  }) => {
    const [currentDate, setCurrentDate] = useState(new Date())
    
    const getDaysInMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }
    
    const getFirstDayOfMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    }
    
    const isDateDisabled = (date: Date) => {
      if (minDate) {
        // Disable dates before minDate (but allow same day)
        const minDateStart = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
        const currentDateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        return currentDateStart < minDateStart
      }
      return false
    }
    
    const handleDateClick = (day: number) => {
      const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      if (!isDateDisabled(selectedDate)) {
        onDateSelect(selectedDate)
      }
    }
    
    if (!isOpen) return null
    
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Select Date</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <span className="font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
              const isDisabled = isDateDisabled(date)
              const isToday = date.toDateString() === new Date().toDateString()
              
              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  disabled={isDisabled}
                  className={`p-2 text-sm rounded hover:bg-blue-100 ${
                    isDisabled 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : isToday 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const handleCheckIn = async (guestId: string) => {
    if (!hasPermission('guests:edit')) {
      showNotification('error', 'You do not have permission to check in guests.')
      return
    }

    try {
      const response = await guestsAPI.updateGuest(guestId, { status: 'checked-in' })
      if (response.success) {
    showNotification('success', 'Guest checked in successfully!')
      } else {
        showNotification('error', 'Failed to check in guest. Please try again.')
      }
    } catch (error) {
      console.error('Error checking in guest:', error)
      showNotification('error', 'Failed to check in guest. Please try again.')
    }
  }

  const handleCheckOut = (guestId: string) => {
    if (!hasPermission('guests:edit')) {
      showNotification('error', 'You do not have permission to check out guests.')
      return
    }

    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    
    setCheckoutGuest(guest)
    // Default today's date in dd-mm-yyyy using shared utils
    const formattedToday = formatToDDMMYYYY(formatTodayISO())
    
    setCheckoutDetails({
      actualCheckOutDate: formattedToday,
      finalAmount: guest.totalAmount,
      additionalCharges: 0,
      laundryCharges: 0,
      halfDayCharges: 0,
      paymentMethod: 'CASH',
      notes: ''
    })
    setShowCheckoutModal(true)
  }

  const handleCheckoutSubmit = async () => {
    if (!checkoutGuest) return

    // Validation
    if (!checkoutDetails.actualCheckOutDate) {
      showNotification('error', 'Please enter checkout date')
      return
    }

    if (!validateDate(checkoutDetails.actualCheckOutDate)) {
      showNotification('error', 'Please enter a valid checkout date (dd-mm-yyyy format)')
      return
    }

    if (checkoutDetails.finalAmount < 0) {
      showNotification('error', 'Final amount cannot be negative')
      return
    }


    try {
      const response = await guestsAPI.updateGuest(checkoutGuest.id, {
          status: 'checked-out',
            totalAmount: checkoutDetails.finalAmount,
            paidAmount: checkoutDetails.finalAmount,
          checkOutDate: convertDateToBackendFormat(checkoutDetails.actualCheckOutDate)
      })

      if (response.success) {
    // Close modal and show success
    setShowCheckoutModal(false)
    setCheckoutGuest(null)
    setCheckoutDetails({
      actualCheckOutDate: '',
      finalAmount: 0,
      additionalCharges: 0,
      laundryCharges: 0,
      halfDayCharges: 0,
      paymentMethod: 'CASH',
      notes: ''
    })
    
    showNotification('success', `Guest ${checkoutGuest.name} checked out successfully!`)
      } else {
        showNotification('error', 'Failed to check out guest. Please try again.')
      }
    } catch (error) {
      console.error('Error checking out guest:', error)
      showNotification('error', 'Failed to check out guest. Please try again.')
    }
  }

  // Bill generation function
  const generateBill = async () => {
    if (!checkoutGuest) return

    try {
      // Fetch fresh guest data from backend using service layer
      const guestsResp = await guestsAPI.getAllGuests()
      const guestsDataList = guestsResp.success ? (guestsResp.data as any[]) || [] : []
      const freshGuestData = guestsDataList.find((g: any) => g.id === checkoutGuest?.id)
      
      // Use fresh guest data if available, otherwise use checkoutGuest
      const guestForBill = freshGuestData || checkoutGuest
      
      // Get bill number from backend via API service
      const billResp = await billingAPI.getBillNumber()
      const billNumber = billResp.success && (billResp as any).billNumber ? (billResp as any).billNumber : (billResp.data?.billNumber || '0001')

      // Get room price (per-day base rate) from rooms data
      const roomsResp = await roomsAPI.getAllRooms()
      const roomList = roomsResp.success ? (roomsResp.data as any[]) || [] : []
      const room = roomList.find((r: any) => r.number === guestForBill.roomNumber)
      const roomBasePricePerDay: number = room && typeof room.price === 'number' ? room.price : 0

      // Use shared billing calculation
      const billingInputs = {
        checkInDate: guestForBill.checkInDate,
        checkOutDate: checkoutDetails.actualCheckOutDate,
        roomNumber: guestForBill.roomNumber,
        guest: guestForBill,
        checkoutDetails,
        roomBasePrice: roomBasePricePerDay
      }

      const breakdown = calculateBill(billingInputs)
      const displayValues = getDisplaySafeValues(breakdown)
      const { formattedArrivalDate, formattedDepartureDate } = formatBillDates(guestForBill.checkInDate, checkoutDetails.actualCheckOutDate)

      // Get current date and time for checkout
      const now = new Date()
      const billTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      // Get actual check-in time from guest data
      const checkInTime = new Date(guestForBill.createdAt || guestForBill.updatedAt || Date.now())
      const formattedCheckInTime = checkInTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      // Compute amount in words
      const amountInWords = numberToIndianWords(breakdown.totalAmountDisplay)

      // Compute logo URL (served from public/logo.png)
      const logoUrl = `${window.location.origin}/logo.png`

      // Create bill HTML
      const billHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title></title>
          <style>
            @media print {
              @page { size: A4; margin: 5mm; }
              html, body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .charges-table, .signature-row { page-break-inside: avoid; }
              .invoice-container { height: 287mm; padding: 4mm; box-sizing: border-box; display: flex; flex-direction: column; }
              .content { flex: 1 1 auto; }
              .signature-row { margin-top: auto; margin-bottom: 3mm; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              font-size: 12px;
              line-height: 1.3;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .hotel-name { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
            .hotel-details { font-size: 11px; color: #444; line-height: 1.5; }
            .logo-row { display: flex; justify-content: center; margin-bottom: 8px; }
            .logo { max-height: 70px; width: auto; }
            .invoice-title { font-size: 16px; font-weight: bold; text-align: center; margin: 12px 0; }
            .guest-info { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .guest-details, .stay-details { width: 48%; }
            .section-title { font-weight: bold; margin-bottom: 8px; font-size: 16px; }
            .info-row { margin-bottom: 6px; font-size: 13.5px; }
            .charges-table { width: 100%; border-collapse: collapse; margin: 10px 0; table-layout: fixed; }
            .charges-table th, .charges-table td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              text-align: left; 
              font-size: 12px;
              word-wrap: break-word;
            }
            .charges-table th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .bank-details { margin-top: 14px; }
            .footer { margin-top: 12px; text-align: center; font-size: 10px; }
            .print-btn, .edit-btn { 
              position: fixed; 
              top: 20px; 
              padding: 10px 20px; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              margin-right: 10px;
            }
            .print-btn { 
              right: 20px; 
              background: #007bff; 
            }
            .print-btn:hover { background: #0056b3; }
            .edit-btn { 
              right: 120px; 
              background: #28a745; 
            }
            .edit-btn:hover { background: #218838; }
            .editable { 
              border: 1px dashed #ccc; 
              padding: 2px; 
              min-height: 1em; 
            }
            .editable:focus { 
              outline: 2px solid #007bff; 
              border: 1px solid #007bff; 
            }

                         /* Signature area */
             .signature-row {
               display: flex; justify-content: space-between; margin-top: 32px;
             }
             .signature-box { width: 40%; text-align: center; }
             .signature-line { border-top: 1px solid #000; margin-top: 24px; padding-top: 6px; }
          </style>
        </head>
        <body>
          <button class="edit-btn no-print" onclick="toggleEdit()">Edit Bill</button>
          <button class="print-btn no-print" onclick="window.print()">Print Bill</button>
          
          <div class="invoice-container">
          <div class="header">
            <div class="logo-row">
              <img src="${logoUrl}" alt="Logo" class="logo" />
            </div>
            <div class="hotel-name">Hotel Diplomat Residency</div>
            <div class="hotel-details">
              (A Unit of Aronax Enterprises Private Limited)<br>
              GST No: 09AANCA1929Q1ZY | CIN: U521000L2015PTC274988<br>
              63 Prakash Tower, Choupla Road Civil Lines, Bareilly - 243001 (Uttar Pradesh) INDIA<br>
              Mail: diplomatresidency.bly@gmail.com<br>
              Ph No: +91-9219414284
            </div>
          </div>

          

                      <div class="guest-info content">
              <div class="guest-details">
                <div class="section-title">Billing To:</div>
                              <div class="info-row editable" contenteditable="false">Name: ${guestForBill.name}</div>
              <div class="info-row editable" contenteditable="false">Company: </div>
              <div class="info-row editable" contenteditable="false">Designation: </div>
              <div class="info-row editable" contenteditable="false">Address: ${guestForBill.address || 'BAREILLY'}</div>
              <div class="info-row editable" contenteditable="false">Phone No: ${guestForBill.phone}</div>
              <div class="info-row editable" contenteditable="false">Email ID: ${guestForBill.email || ''}</div>
              <div class="info-row editable" contenteditable="false">GST NO: </div>
              </div>
              <div class="stay-details">
                <div class="section-title">Stay Details:</div>
                              <div class="info-row editable" contenteditable="false">Date of Arrival: ${formattedArrivalDate}</div>
              <div class="info-row editable" contenteditable="false">Date of Departure: ${formattedDepartureDate}</div>
              <div class="info-row editable" contenteditable="false">Bill No: ${billNumber}</div>
              <div class="info-row editable" contenteditable="false">ROOM NO: ${guestForBill.roomNumber}</div>
              <div class="info-row editable" contenteditable="false">PAX: ${1 + (guestForBill.secondaryGuest ? 1 : 0) + (guestForBill.extraBeds ? guestForBill.extraBeds.length : 0)}</div>
              <div class="info-row editable" contenteditable="false">Plan: ${guestForBill.plan || 'EP'}</div>
              <div class="info-row editable" contenteditable="false">Check In Time: ${formattedCheckInTime}</div>
              <div class="info-row editable" contenteditable="false">Check Out Time: ${billTime}</div>
              </div>
            </div>

          <table class="charges-table">
            <thead>
              <tr>
                <th>Room No.</th>
                <th>Name</th>
                <th>No. of Days</th>
                <th>Price/Day</th>
                <th>Taxable Value</th>
                <th>Tax Rate</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="editable" contenteditable="false">${guestForBill.roomNumber}</td>
                <td class="editable" contenteditable="false">${guestForBill.name}</td>
                <td class="editable" contenteditable="false">${breakdown.daysDiff}</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayPricePerDay}</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayRoomRentTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayRoomRentCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayRoomRentSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayRoomRent}</td>
              </tr>
              ${breakdown.extraBedCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Extra Bed Charges</td>
                <td class="editable" contenteditable="false">₹${breakdown.extraBedTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${breakdown.extraBedCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.extraBedSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.extraBedCharges}</td>
              </tr>
              ` : ''}
              ${breakdown.additionalCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Fooding Charges</td>
                <td class="editable" contenteditable="false">₹${breakdown.foodingTaxableValue.toFixed(2)}</td>
                <td>5%</td>
                <td class="editable" contenteditable="false">₹${breakdown.foodingCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.foodingSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.additionalCharges}</td>
              </tr>
              ` : ''}
              ${breakdown.laundryCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Laundry Charges</td>
                <td class="editable" contenteditable="false">₹${breakdown.laundryTaxableValue.toFixed(2)}</td>
                <td>5%</td>
                <td class="editable" contenteditable="false">₹${breakdown.laundryCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.laundrySgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.laundryCharges}</td>
              </tr>
              ` : ''}
              ${breakdown.halfDayCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Late Checkout Charges</td>
                <td class="editable" contenteditable="false">₹${breakdown.halfDayTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${breakdown.halfDayCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.halfDaySgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.halfDayCharges}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td colspan="4">TOTAL</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalTaxableValue.toFixed(2)}</td>
                <td></td>
                <td class="editable" contenteditable="false">₹${breakdown.totalCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalAmountDisplay}</td>
              </tr>
            </tbody>
          </table>

          <div style="text-align: right; font-size: 11px; margin-top: 4px;">
            <span>Round Off:</span> <span class="editable" contenteditable="false">₹${(breakdown.totalAmountDisplay - breakdown.totalAmount).toFixed(2)}</span>
          </div>

          <div style="margin: 10px 0;">
            <strong>IN WORD:</strong> <span class="editable" contenteditable="false">${amountInWords} ONLY.</span>
          </div>

          <div style="margin: 10px 0;">
            <strong>STAX NO:</strong> AANCA1929QSD001 | <strong>PAN NO:</strong> AANCA1929Q
          </div>

          <div class="bank-details">
            <div class="section-title">Bank Account Detail:</div>
            <div class="info-row">Account Holder: Aronax Enterprises Private Limited</div>
            <div class="info-row">Bank Name: HDFC Bank Limited</div>
            <div class="info-row">Account No: 50200011166109</div>
            <div class="info-row">IFSC Code: HDFC0000304</div>
          </div>

          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-line">Authorised Signatory</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Guest Signature</div>
            </div>
          </div>

          <div class="footer">
            <div style="margin-bottom: 6px;">*Please Deposit your Key to the Receptionists*</div>
            <div>THANK YOU FOR YOUR VISIT, PLEASE VISIT AGAIN !!!!</div>
          </div>
          </div>

          <script>
            let isEditMode = false;
            
            function toggleEdit() {
              const editables = document.querySelectorAll('.editable');
              const editBtn = document.querySelector('.edit-btn');
              
              isEditMode = !isEditMode;
              
              editables.forEach(element => {
                element.contentEditable = isEditMode;
                if (isEditMode) {
                  element.style.backgroundColor = '#f8f9fa';
                } else {
                  element.style.backgroundColor = '';
                }
              });
              
              if (isEditMode) {
                editBtn.textContent = 'Save & Exit Edit';
                editBtn.style.background = '#dc3545';
                editBtn.onclick = saveAndExitEdit;
              } else {
                editBtn.textContent = 'Edit Bill';
                editBtn.style.background = '#28a745';
                editBtn.onclick = toggleEdit;
              }
            }
            
            function saveAndExitEdit() {
              const editables = document.querySelectorAll('.editable');
              const editBtn = document.querySelector('.edit-btn');
              
              editables.forEach(element => {
                element.contentEditable = false;
                element.style.backgroundColor = '';
              });
              
              editBtn.textContent = 'Edit Bill';
              editBtn.style.background = '#28a745';
              editBtn.onclick = toggleEdit;
              
              isEditMode = false;
              
              // Send message to parent window to show notification
              if (window.opener) {
                window.opener.postMessage('bill-saved', '*');
              }
            }
          </script>
        </body>
        </html>
      `

      // Open bill in new window
      const billWindow = window.open('', '_blank', 'width=800,height=600')
      if (billWindow) {
        billWindow.document.write(billHTML)
        billWindow.document.close()
        
        // Listen for save notification from bill window (once)
        const handler = (event: MessageEvent) => {
          if (event.data === 'bill-saved') {
            showNotification('success', 'Bill has been saved! You can now print the modified bill.', 5000)
            window.removeEventListener('message', handler)
          }
        }
        window.addEventListener('message', handler)
      }
    } catch (error) {
      console.error('Bill generation error:', error)
      showNotification('error', 'Failed to generate bill. Please try again.')
    }
  }

  // Bill preview function (no bill number, no edit button)
  const previewBill = async () => {
    if (!checkoutGuest) return

    try {
      // Fetch latest guest data via API service
      const guestsResp = await guestsAPI.getAllGuests()
      const guestsDataList = guestsResp.success ? (guestsResp.data as any[]) || [] : []
      const freshGuestData = guestsDataList.find((g: any) => g.id === checkoutGuest?.id)
      const guestForBill = freshGuestData || checkoutGuest

      // Get room price (per-day base rate) from rooms data
      const roomsResp = await roomsAPI.getAllRooms()
      const roomList = roomsResp.success ? (roomsResp.data as any[]) || [] : []
      const room = roomList.find((r: any) => r.number === guestForBill.roomNumber)
      const roomBasePricePerDay: number = room && typeof room.price === 'number' ? room.price : 0

      // Use shared billing calculation
      const billingInputs = {
        checkInDate: guestForBill.checkInDate,
        checkOutDate: checkoutDetails.actualCheckOutDate,
        roomNumber: guestForBill.roomNumber,
        guest: guestForBill,
        checkoutDetails,
        roomBasePrice: roomBasePricePerDay
      }

      const breakdown = calculateBill(billingInputs)
      const displayValues = getDisplaySafeValues(breakdown)
      const { formattedArrivalDate, formattedDepartureDate } = formatBillDates(guestForBill.checkInDate, checkoutDetails.actualCheckOutDate)

      // Times
      const now = new Date()
      const billTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      const checkInTime = new Date(guestForBill.createdAt || guestForBill.updatedAt || Date.now())
      const formattedCheckInTime = checkInTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      const amountInWords = numberToIndianWords(breakdown.totalAmountDisplay)

      const logoUrl = `${window.location.origin}/logo.png`

      const billHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title></title>
          <style>
            @media print {
              @page { size: A4; margin: 5mm; }
              html, body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .charges-table, .signature-row { page-break-inside: avoid; }
              .invoice-container { height: 287mm; padding: 4mm; box-sizing: border-box; display: flex; flex-direction: column; }
              .content { flex: 1 1 auto; }
              .signature-row { margin-top: auto; margin-bottom: 3mm; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              font-size: 12px;
              line-height: 1.3;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .hotel-name { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
            .hotel-details { font-size: 11px; color: #444; line-height: 1.5; }
            .logo-row { display: flex; justify-content: center; margin-bottom: 8px; }
            .logo { max-height: 70px; width: auto; }
            .guest-info { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .guest-details, .stay-details { width: 48%; }
            .section-title { font-weight: bold; margin-bottom: 8px; font-size: 16px; }
            .info-row { margin-bottom: 6px; font-size: 13.5px; }
            .charges-table { width: 100%; border-collapse: collapse; margin: 10px 0; table-layout: fixed; }
            .charges-table th, .charges-table td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              text-align: left; 
              font-size: 12px;
              word-wrap: break-word;
            }
            .charges-table th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .bank-details { margin-top: 14px; }
            .footer { margin-top: 12px; text-align: center; font-size: 10px; }
            .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; color: white; border: none; border-radius: 5px; cursor: pointer; background: #007bff; }
            .print-btn:hover { background: #0056b3; }
            .editable { border: 1px dashed #ccc; padding: 2px; min-height: 1em; }
          </style>
        </head>
        <body>
          <button class="print-btn no-print" onclick="window.print()">Print Preview</button>
          
          <div class="invoice-container">
          <div class="header">
            <div class="logo-row">
              <img src="${logoUrl}" alt="Logo" class="logo" />
            </div>
            <div class="hotel-name">Hotel Diplomat Residency</div>
            <div class="hotel-details">
              (A Unit of Aronax Enterprises Private Limited)<br>
              GST No: 09AANCA1929Q1ZY | CIN: U521000L2015PTC274988<br>
              63 Prakash Tower, Choupla Road Civil Lines, Bareilly - 243001 (Uttar Pradesh) INDIA<br>
              Mail: diplomatresidency.bly@gmail.com<br>
              Ph No: +91-9219414284
            </div>
          </div>

                      <div class="guest-info content">
            <div class="guest-details">
              <div class="section-title">Billing To:</div>
              <div class="info-row editable" contenteditable="false">Name: ${guestForBill.name}</div>
              <div class="info-row editable" contenteditable="false">Company: </div>
              <div class="info-row editable" contenteditable="false">Designation: </div>
              <div class="info-row editable" contenteditable="false">Address: ${guestForBill.address || 'BAREILLY'}</div>
              <div class="info-row editable" contenteditable="false">Phone No: ${guestForBill.phone}</div>
              <div class="info-row editable" contenteditable="false">Email ID: ${guestForBill.email || ''}</div>
              <div class="info-row editable" contenteditable="false">GST NO: </div>
            </div>
            <div class="stay-details">
              <div class="section-title">Stay Details:</div>
              <div class="info-row editable" contenteditable="false">Date of Arrival: ${formattedArrivalDate}</div>
              <div class="info-row editable" contenteditable="false">Date of Departure: ${formattedDepartureDate}</div>
              <div class="info-row editable" contenteditable="false">ROOM NO: ${guestForBill.roomNumber}</div>
              <div class="info-row editable" contenteditable="false">PAX: ${1 + (guestForBill.secondaryGuest ? 1 : 0) + (guestForBill.extraBeds ? guestForBill.extraBeds.length : 0)}</div>
              <div class="info-row editable" contenteditable="false">Plan: ${guestForBill.plan || 'EP'}</div>
              <div class="info-row editable" contenteditable="false">Check In Time: ${formattedCheckInTime}</div>
              <div class="info-row editable" contenteditable="false">Check Out Time: ${billTime}</div>
            </div>
          </div>

          <table class="charges-table">
            <thead>
              <tr>
                <th>Room No.</th>
                <th>Name</th>
                <th>No. of Days</th>
                <th>Price/Day</th>
                <th>Taxable Value</th>
                <th>Tax Rate</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="editable" contenteditable="false">${guestForBill.roomNumber}</td>
                <td class="editable" contenteditable="false">${guestForBill.name}</td>
                <td class="editable" contenteditable="false">${breakdown.daysDiff}</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayPricePerDay}</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayRoomRentTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayRoomRentCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayRoomRentSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${displayValues.displayRoomRent}</td>
              </tr>
              ${breakdown.extraBedCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Extra Bed Charges</td>
                <td class="editable" contenteditable="false">₹${breakdown.extraBedTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${breakdown.extraBedCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.extraBedSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.extraBedCharges}</td>
              </tr>
              ` : ''}
              ${breakdown.additionalCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Fooding Charges</td>
                <td class="editable" contenteditable="false">₹${breakdown.foodingTaxableValue.toFixed(2)}</td>
                <td>5%</td>
                <td class="editable" contenteditable="false">₹${breakdown.foodingCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.foodingSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.additionalCharges}</td>
              </tr>
              ` : ''}
              ${breakdown.laundryCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Laundry Charges</td>
                <td class="editable" contenteditable="false">₹${breakdown.laundryTaxableValue.toFixed(2)}</td>
                <td>5%</td>
                <td class="editable" contenteditable="false">₹${breakdown.laundryCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.laundrySgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.laundryCharges}</td>
              </tr>
              ` : ''}
              ${breakdown.halfDayCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Late Checkout Charges</td>
                <td class="editable" contenteditable="false">₹${breakdown.halfDayTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${breakdown.halfDayCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.halfDaySgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.halfDayCharges}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td colspan="4">TOTAL</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalTaxableValue.toFixed(2)}</td>
                <td></td>
                <td class="editable" contenteditable="false">₹${breakdown.totalCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalAmountDisplay}</td>
              </tr>
            </tbody>
          </table>

          <div style="text-align: right; font-size: 11px; margin-top: 4px;">
            <span>Round Off:</span> <span class="editable" contenteditable="false">₹${(breakdown.totalAmountDisplay - breakdown.totalAmount).toFixed(2)}</span>
          </div>

          <div style="margin: 10px 0;">
            <strong>IN WORD:</strong> <span class="editable" contenteditable="false">${amountInWords} ONLY.</span>
          </div>

          <div style="margin: 10px 0;">
            <strong>STAX NO:</strong> AANCA1929QSD001 | <strong>PAN NO:</strong> AANCA1929Q
          </div>

          <div class="bank-details">
            <div class="section-title">Bank Account Detail:</div>
            <div class="info-row">Account Holder: Aronax Enterprises Private Limited</div>
            <div class="info-row">Bank Name: HDFC Bank Limited</div>
            <div class="info-row">Account No: 50200011166109</div>
            <div class="info-row">IFSC Code: HDFC0000304</div>
          </div>

          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-line">Authorised Signatory</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Guest Signature</div>
            </div>
          </div>

          <div class="footer">
            <div style="margin-bottom: 6px;">*Please Deposit your Key to the Receptionists*</div>
            <div>THANK YOU FOR YOUR VISIT, PLEASE VISIT AGAIN !!!!</div>
          </div>
          </div>
        </body>
        </html>
      `

      const billWindow = window.open('', '_blank', 'width=800,height=600')
      if (billWindow) {
        billWindow.document.write(billHTML)
        billWindow.document.close()
      }
    } catch (error) {
      console.error('Bill preview error:', error)
      showNotification('error', 'Failed to preview bill. Please try again.')
    }
  }

  // Helper function to convert number to words
  const numberToWords = (num: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE']
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']

    if (num === 0) return 'ZERO'
    if (num < 10) return ones[num]
    if (num < 20) return teens[num - 10]
    if (num < 100) {
      if (num % 10 === 0) return tens[Math.floor(num / 10)]
      return tens[Math.floor(num / 10)] + ' ' + ones[num % 10]
    }
    if (num < 1000) {
      if (num % 100 === 0) return ones[Math.floor(num / 100)] + ' HUNDRED'
      return ones[Math.floor(num / 100)] + ' HUNDRED AND ' + numberToWords(num % 100)
    }
    if (num < 100000) {
      if (num % 1000 === 0) return numberToWords(Math.floor(num / 1000)) + ' THOUSAND'
      return numberToWords(Math.floor(num / 1000)) + ' THOUSAND ' + numberToWords(num % 1000)
    }
    return 'RUPEES'
  }

  const handleAddGuest = async () => {
    if (!hasPermission('guests:create')) {
      showNotification('error', 'You do not have permission to add guests.')
      return
    }

    if (!newGuest.name || !newGuest.phone || !newGuest.idProof || !newGuest.roomNumber) {
      showNotification('error', 'Please fill all mandatory fields (Name, Phone, ID Proof, Room Number)')
      return
    }

    // Validate secondary guest if shown
    if (showSecondaryGuest && newGuest.secondaryGuest) {
      if (!newGuest.secondaryGuest.name) {
        showNotification('error', 'Please fill all mandatory fields for secondary guest (Name is required)')
        return
      }
    }

    // Validate extra beds
    if (extraBeds.length > 0) {
      for (let i = 0; i < extraBeds.length; i++) {
        const extraBed = extraBeds[i]
        if (!extraBed.name || !extraBed.charge || extraBed.charge <= 0) {
          showNotification('error', `Please fill all mandatory fields for extra bed ${i + 1} (Name and Charge are required)`)
          return
        }
      }
    }

    // Validate dates
    if (newGuest.checkInDate && !validateDate(newGuest.checkInDate)) {
      showNotification('error', 'Please enter a valid check-in date (dd-mm-yyyy format)')
      return
    }

    if (newGuest.checkOutDate && !validateDate(newGuest.checkOutDate)) {
      showNotification('error', 'Please enter a valid check-out date (dd-mm-yyyy format)')
      return
    }

    // Validate check-out date is not before check-in date (allows same day)
    if (newGuest.checkInDate && newGuest.checkOutDate && validateDate(newGuest.checkInDate) && validateDate(newGuest.checkOutDate)) {
      const checkInDate = new Date(newGuest.checkInDate.split('-').reverse().join('-'))
      const checkOutDate = new Date(newGuest.checkOutDate.split('-').reverse().join('-'))
      
      // Compare dates by setting time to start of day for accurate comparison
      const checkInStart = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())
      const checkOutStart = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate())
      
      if (checkOutStart < checkInStart) {
        showNotification('error', 'Check-out date cannot be before check-in date')
        return
      }
    }

    // Check if room is already occupied
    const isRoomOccupied = guests.some(guest => 
      guest.roomNumber === newGuest.roomNumber && guest.status === 'checked-in'
    )
    
    if (isRoomOccupied) {
      showNotification('error', 'This room is already occupied. Please select a different room.')
      return
    }

    // Note: Minimum amount restriction removed (UI hint remains as requested)
    const totalExtraBedCharges = extraBeds.reduce((sum, bed) => sum + bed.charge, 0)
    const totalWithExtraBeds = newGuest.totalAmount + totalExtraBedCharges

    try {
      // Send guest data to backend
      const guestData = {
      name: newGuest.name,
      email: newGuest.email,
      phone: newGuest.phone,
      roomNumber: newGuest.roomNumber,
        checkInDate: convertDateToBackendFormat(newGuest.checkInDate),
        checkOutDate: newGuest.checkOutDate ? convertDateToBackendFormat(newGuest.checkOutDate) : '',
      totalAmount: newGuest.complimentary ? 0 : (newGuest.totalAmount + totalExtraBedCharges),
      paidAmount: newGuest.complimentary ? 0 : newGuest.paidAmount,
      address: newGuest.address,
      idProof: `${newGuest.idProofType}-${newGuest.idProof}`,
      category: newGuest.category,
      plan: newGuest.plan,
        status: 'checked-in',
      complimentary: !!newGuest.complimentary,
      secondaryGuest: showSecondaryGuest && newGuest.secondaryGuest ? {
        name: newGuest.secondaryGuest.name,
        phone: newGuest.secondaryGuest.phone || '',
        idProof: newGuest.secondaryGuest.idProof ? `${newGuest.secondaryGuest.idProofType}-${newGuest.secondaryGuest.idProof}` : ''
      } : undefined,
      extraBeds: extraBeds.length > 0 ? extraBeds.map(bed => ({
        name: bed.name,
        phone: bed.phone || '',
        idProof: bed.idProof ? `${bed.idProofType}-${bed.idProof}` : '',
        charge: bed.charge
      })) : undefined
    }

      const response = await guestsAPI.createGuest(guestData)
      
      if (response.success && response.data) {
        // Update room status to occupied
        const roomsRes = await roomsAPI.getAllRooms()
        if (roomsRes.success) {
          const room = (roomsRes.data as any[]).find((r: any) => r.number === newGuest.roomNumber)
          if (room) {
            await roomsAPI.updateRoom(room.id, {
                status: 'OCCUPIED',
                currentGuest: newGuest.name,
                checkInDate: guestData.checkInDate,
                checkOutDate: guestData.checkOutDate
            })
          }
        }

        // Refresh guests list
        const refreshRes = await guestsAPI.getAllGuests()
        if (refreshRes.success) {
          setGuests(refreshRes.data || [])
        }
    
    // Reset form
    setNewGuest({
      name: '',
      email: '',
      phone: '',
      roomNumber: '',
      checkInDate: '',
      checkOutDate: '',
      totalAmount: 0,
      paidAmount: 0,
      address: '',
      idProof: '',
      idProofType: 'AADHAR',
      category: 'couple',
      plan: 'EP',
      complimentary: false,
      secondaryGuest: undefined,
    })
    
    setShowAddGuest(false)
    setShowSecondaryGuest(false)
    setExtraBeds([])
    
    // Show success message
        const message = guestData.complimentary 
      ? 'Complimentary guest added successfully!' 
      : 'Guest added successfully!'
    showNotification('success', message)
      } else {
        showNotification('error', 'Failed to add guest. Please try again.')
      }
    } catch (error) {
      console.error('Error adding guest:', error)
      showNotification('error', 'Failed to add guest. Please try again.')
    }
  }

  // Define category options as a constant for type safety
  const CATEGORY_OPTIONS = [
    { value: 'couple', label: 'Couple' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'solo', label: 'Solo' },
    { value: 'family', label: 'Family' }
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
          <p className="text-gray-600">Manage guest check-ins, check-outs, and information</p>
        </div>
        {hasPermission('guests:create') && (
          <button 
            onClick={() => setShowAddGuest(true)}
            className="btn-primary flex items-center"
            title="Add a new guest"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Guest
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search guests by name, email, or room number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              title="Filter by guest status"
            >
              <option value="all">All Status</option>
              <option value="checked-in">Checked In</option>
              <option value="checked-out">Checked Out</option>
              <option value="reserved">Reserved</option>
            </select>

          </div>
        </div>
      </div>

      {/* Guests List */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading guests...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-2">Failed to load guests</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in/Check-out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {guest.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {guest.secondaryGuest && (
                            <div className="text-blue-600">+ {guest.secondaryGuest.name}</div>
                          )}
                          {guest.extraBeds && guest.extraBeds.map((bed, index) => (
                            <div key={index} className="text-green-600">+ {bed.name}</div>
                          ))}
                        </div>
                        <div className="text-sm text-gray-500">{guest.email}</div>
                        <div className="text-sm text-gray-500">{guest.phone}</div>
                        {guest.secondaryGuest?.phone && (
                          <div className="text-sm text-gray-500">+ {guest.secondaryGuest.phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">Room {guest.roomNumber}</div>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      guest.category === 'couple' ? 'bg-blue-100 text-blue-800' :
                      guest.category === 'corporate' ? 'bg-green-100 text-green-800' :
                      guest.category === 'solo' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {guest.category.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>Check-in: {guest.checkInDate}</div>
                      <div>Check-out: {guest.checkOutDate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(guest.status)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(guest.status)}`}>
                        {guest.status.replace('-', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {guest.complimentary ? (
                        <div className="flex items-center">
                          <span className="text-green-600 font-medium">Complimentary</span>
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">No Charge</span>
                        </div>
                      ) : (
                        <>
                          <div>Total: ₹{guest.totalAmount}</div>
                          <div>Paid: ₹{guest.paidAmount}</div>
                          {guest.paidAmount < guest.totalAmount && (
                            <div className="text-red-600 text-xs">Balance: ₹{guest.totalAmount - guest.paidAmount}</div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {guest.status === 'reserved' && hasPermission('guests:edit') && (
                        <button
                          onClick={() => handleCheckIn(guest.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Check In
                        </button>
                      )}
                      {guest.status === 'checked-in' && hasPermission('guests:edit') && (
                        <button
                          onClick={() => handleCheckOut(guest.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Check Out
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedGuest(guest)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View guest details"
                      >
                        View Details
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setEditMenuGuestId(editMenuGuestId === guest.id ? null : guest.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="More actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {editMenuGuestId === guest.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                            <button
                              onClick={() => {
                                // Open edit modal with pre-filled data
                                setEditMenuGuestId(null)
                                setEditGuest(guest)
                                setEditForm({
                                  name: guest.name || '',
                                  email: guest.email || '',
                                  phone: guest.phone || '',
                                  address: guest.address || '',
                                  idProof: guest.idProof || '',
                                  idProofType: (guest as any).idProofType || '',
                                  secondaryGuest: guest.secondaryGuest ? {
                                    name: guest.secondaryGuest.name || '',
                                    phone: guest.secondaryGuest.phone,
                                    idProof: guest.secondaryGuest.idProof,
                                    idProofType: guest.secondaryGuest.idProofType
                                  } : undefined,
                                  extraBeds: (guest.extraBeds || []).map(b => ({
                                    name: b.name,
                                    phone: b.phone,
                                    idProof: b.idProof,
                                    idProofType: b.idProofType,
                                    charge: b.charge
                                  }))
                                })
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Edit Details
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Guest Details Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setSelectedGuest(null)}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Guest Details</h3>
                <button
                  onClick={() => setSelectedGuest(null)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close guest details"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Primary Guest</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{selectedGuest.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{selectedGuest.email}</p>
                  <p className="mt-1 text-sm text-gray-600">{selectedGuest.phone}</p>
                </div>

      {/* Edit Guest Modal */}
      {editGuest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setEditGuest(null)}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Guest Details</h3>
                <button onClick={() => setEditGuest(null)} className="text-gray-400 hover:text-gray-600" title="Close">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input className="input-field mt-1" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input className="input-field mt-1" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input className="input-field mt-1" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input className="input-field mt-1" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Proof</label>
                  <input className="input-field mt-1" value={editForm.idProof} onChange={e => setEditForm({ ...editForm, idProof: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Proof Type</label>
                  <input className="input-field mt-1" value={editForm.idProofType} onChange={e => setEditForm({ ...editForm, idProofType: e.target.value })} />
                </div>
              </div>

              {/* Secondary guest (optional) */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Secondary Guest (optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input className="input-field mt-1" value={editForm.secondaryGuest?.name || ''} onChange={e => setEditForm({ ...editForm, secondaryGuest: { name: e.target.value, phone: editForm.secondaryGuest?.phone, idProof: editForm.secondaryGuest?.idProof, idProofType: editForm.secondaryGuest?.idProofType || '' } })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input className="input-field mt-1" value={editForm.secondaryGuest?.phone || ''} onChange={e => setEditForm({ ...editForm, secondaryGuest: { name: editForm.secondaryGuest?.name || '', phone: e.target.value, idProof: editForm.secondaryGuest?.idProof, idProofType: editForm.secondaryGuest?.idProofType || '' } })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Proof</label>
                    <input className="input-field mt-1" value={editForm.secondaryGuest?.idProof || ''} onChange={e => setEditForm({ ...editForm, secondaryGuest: { name: editForm.secondaryGuest?.name || '', phone: editForm.secondaryGuest?.phone, idProof: e.target.value, idProofType: editForm.secondaryGuest?.idProofType || '' } })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Proof Type</label>
                    <input className="input-field mt-1" value={editForm.secondaryGuest?.idProofType || ''} onChange={e => setEditForm({ ...editForm, secondaryGuest: { name: editForm.secondaryGuest?.name || '', phone: editForm.secondaryGuest?.phone, idProof: editForm.secondaryGuest?.idProof, idProofType: e.target.value } })} />
                  </div>
                </div>
              </div>

              {/* Extra beds */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Extra Beds</h4>
                  <button onClick={addEditExtraBed} className="text-sm text-primary-600 hover:text-primary-800">+ Add Extra Bed</button>
                </div>
                {(editForm.extraBeds || []).map((bed, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 p-3 bg-gray-50 rounded">
                    <div>
                      <label className="block text-xs text-gray-600">Name</label>
                      <input className="input-field mt-1" value={bed.name} onChange={e => handleEditExtraBedChange(index, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Phone</label>
                      <input className="input-field mt-1" value={bed.phone || ''} onChange={e => handleEditExtraBedChange(index, 'phone', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">ID Proof</label>
                      <input className="input-field mt-1" value={bed.idProof || ''} onChange={e => handleEditExtraBedChange(index, 'idProof', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">ID Proof Type</label>
                      <input className="input-field mt-1" value={bed.idProofType || ''} onChange={e => handleEditExtraBedChange(index, 'idProofType', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Charge</label>
                      <input type="number" className="input-field mt-1" value={bed.charge} onChange={e => handleEditExtraBedChange(index, 'charge', e.target.value)} />
                    </div>
                    <div className="md:col-span-5">
                      <button onClick={() => removeEditExtraBed(index)} className="text-xs text-red-600 hover:text-red-800">Remove</button>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-600">Paid Amount and Balance are not editable here.</div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setEditGuest(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleSaveEditGuest} className="btn-primary">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.address}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Proof</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.idProof}</p>
                </div>
                {selectedGuest.secondaryGuest && (
                  <>
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Secondary Guest</h4>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-900 font-medium">{selectedGuest.secondaryGuest.name}</p>
                        {selectedGuest.secondaryGuest.phone && (
                          <p className="text-sm text-gray-600">{selectedGuest.secondaryGuest.phone}</p>
                        )}
                        {selectedGuest.secondaryGuest.idProof && (
                          <p className="text-sm text-gray-600">ID: {selectedGuest.secondaryGuest.idProof}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {selectedGuest.extraBeds && selectedGuest.extraBeds.length > 0 && (
                  <>
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Extra Beds ({selectedGuest.extraBeds.length})</h4>
                      {selectedGuest.extraBeds.map((bed, index) => (
                        <div key={index} className="space-y-3 mb-4 p-3 bg-green-50 rounded-lg">
                          <div className="text-sm font-medium text-green-800">Extra Bed {index + 1}</div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <p className="mt-1 text-sm text-gray-900">{bed.name}</p>
                          </div>
                          {bed.phone && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Phone</label>
                              <p className="mt-1 text-sm text-gray-900">{bed.phone}</p>
                            </div>
                          )}
                          {bed.idProof && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">ID Proof</label>
                              <p className="mt-1 text-sm text-gray-900">{bed.idProof}</p>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Charge</label>
                            <p className="mt-1 text-sm text-gray-900">₹{bed.charge}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.roomNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">₹{selectedGuest.totalAmount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Paid Amount</label>
                  <p className="mt-1 text-sm text-gray-900">₹{selectedGuest.paidAmount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Balance</label>
                  <p className={`mt-1 text-sm font-medium ${
                    selectedGuest.totalAmount - selectedGuest.paidAmount > 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    ₹{selectedGuest.totalAmount - selectedGuest.paidAmount}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room Type</label>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    selectedGuest.category === 'couple' ? 'bg-blue-100 text-blue-800' :
                    selectedGuest.category === 'corporate' ? 'bg-green-100 text-green-800' :
                    selectedGuest.category === 'solo' ? 'bg-purple-100 text-purple-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedGuest.category.replace('-', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan</label>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    selectedGuest.plan === 'EP' ? 'bg-orange-100 text-orange-800' : 
                    selectedGuest.plan === 'CP' ? 'bg-red-100 text-red-800' :
                    selectedGuest.plan === 'MAP' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedGuest.plan} {
                      selectedGuest.plan === 'EP' ? '(European Plan - Room Only)' : 
                      selectedGuest.plan === 'CP' ? '(Continental Plan - Room + Breakfast)' :
                      selectedGuest.plan === 'MAP' ? '(Modified American Plan - Room + Breakfast + Dinner)' :
                      '(American Plan - Room + All Meals)'
                    }
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-in Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedGuest.checkInDate ? new Date(selectedGuest.checkInDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-in Time</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedGuest.createdAt ? new Date(selectedGuest.createdAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Not available'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-out Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedGuest.checkOutDate ? new Date(selectedGuest.checkOutDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-out Time</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedGuest.updatedAt && selectedGuest.status === 'checked-out' ? new Date(selectedGuest.updatedAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Not checked out yet'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedGuest.status)}`}>
                    {selectedGuest.status.replace('-', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Guest Modal */}
      {showAddGuest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowAddGuest(false)}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Guest</h3>
                <button
                  onClick={() => setShowAddGuest(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close add guest modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newGuest.name}
                    onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
                    className="input-field mt-1"
                    placeholder="Enter full name"
                    required
                    title="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newGuest.email}
                    onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                    className="input-field mt-1"
                    placeholder="Enter email address"
                    title="Email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newGuest.phone}
                    onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                    className="input-field mt-1"
                    placeholder="+91 98765 43210"
                    required
                    title="Mobile number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newGuest.roomNumber}
                    onChange={(e) => {
                      setNewGuest({
                        ...newGuest, 
                        roomNumber: e.target.value
                      })
                    }}
                    className="input-field mt-1"
                    required
                    title="Select available room"
                  >
                    <option value="">Select a room</option>
                    {getAvailableRooms().map(room => (
                      <option key={room.id} value={room.number}>
                        Room {room.number} - {room.type.charAt(0).toUpperCase() + room.type.slice(1)} (₹{room.price}/night)
                      </option>
                    ))}
                  </select>
                  {getAvailableRooms().length === 0 && (
                    <p className="text-sm text-red-500 mt-1">No available rooms at the moment</p>
                  )}
                  {newGuest.roomNumber && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {rooms.find(r => r.number === newGuest.roomNumber)?.type?.charAt(0).toUpperCase() + rooms.find(r => r.number === newGuest.roomNumber)?.type?.slice(1)} room - ₹{rooms.find(r => r.number === newGuest.roomNumber)?.price}/night
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    Room Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newGuest.category}
                    onChange={e => setNewGuest({ ...newGuest, category: e.target.value as GuestCategory })}
                    className="input-field mt-1 border-2 border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500 transition-all bg-white text-base font-semibold text-primary-700"
                    required
                    title="Select room type (solo, couple, family, corporate)"
                    aria-label="Room Type"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select the room type based on guest requirements</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    Plan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newGuest.plan}
                    onChange={e => setNewGuest({ ...newGuest, plan: e.target.value as 'EP' | 'CP' | 'MAP' | 'AP' })}
                    className="input-field mt-1 border-2 border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500 transition-all bg-white text-base font-semibold text-primary-700"
                    required
                    title="Select meal plan (EP, CP, MAP, or AP)"
                    aria-label="Plan"
                  >
                    <option value="EP">EP (European Plan - Room Only)</option>
                    <option value="CP">CP (Continental Plan - Room + Breakfast)</option>
                    <option value="MAP">MAP (Modified American Plan - Room + Breakfast + Dinner)</option>
                    <option value="AP">AP (American Plan - Room + All Meals)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select the meal plan for the guest</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check-in Date</label>
                    <div className="relative">
                    <input
                        type="text"
                        value={formatDateForInput(newGuest.checkInDate)}
                        onChange={(e) => handleDateChange('checkInDate', e.target.value)}
                        className={`input-field mt-1 pr-10 ${newGuest.checkInDate && !validateDate(newGuest.checkInDate) ? 'border-red-500' : ''}`}
                        placeholder="dd-mm-yyyy"
                        title="Check-in date (dd-mm-yyyy format)"
                        maxLength={10}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCheckInCalendar(true)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Open calendar"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                    {newGuest.checkInDate && !validateDate(newGuest.checkInDate) && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid date (dd-mm-yyyy)</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check-out Date</label>
                    <div className="relative">
                    <input
                        type="text"
                        value={formatDateForInput(newGuest.checkOutDate)}
                        onChange={(e) => handleDateChange('checkOutDate', e.target.value)}
                        className={`input-field mt-1 pr-10 ${newGuest.checkOutDate && !validateDate(newGuest.checkOutDate) ? 'border-red-500' : ''}`}
                        placeholder="dd-mm-yyyy"
                        title="Check-out date (dd-mm-yyyy format)"
                        maxLength={10}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCheckOutCalendar(true)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Open calendar"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                    {newGuest.checkOutDate && !validateDate(newGuest.checkOutDate) && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid date (dd-mm-yyyy)</p>
                    )}
                    {newGuest.checkInDate && newGuest.checkOutDate && validateDate(newGuest.checkInDate) && validateDate(newGuest.checkOutDate) && 
                     (() => {
                       const checkInDate = new Date(newGuest.checkInDate.split('-').reverse().join('-'))
                       const checkOutDate = new Date(newGuest.checkOutDate.split('-').reverse().join('-'))
                       const checkInStart = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())
                       const checkOutStart = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate())
                       return checkOutStart < checkInStart
                     })() && (
                      <p className="text-xs text-red-500 mt-1">Check-out date cannot be before check-in date</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Proof Type</label>
                  <select
                    value={newGuest.idProofType}
                    onChange={(e) => setNewGuest({...newGuest, idProofType: e.target.value})}
                    className="input-field mt-1"
                    title="Select ID proof type"
                    aria-label="ID Proof Type"
                    required
                  >
                    <option value="AADHAR">Aadhaar Card</option>
                    <option value="DL">Driving License</option>
                    <option value="VOTER-ID">Voter ID</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT">Passport</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ID Proof Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newGuest.idProof}
                    onChange={(e) => setNewGuest({...newGuest, idProof: e.target.value})}
                    className="input-field mt-1"
                    placeholder="Enter ID proof number"
                    required
                    title="ID proof number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    value={newGuest.address}
                    onChange={(e) => setNewGuest({...newGuest, address: e.target.value})}
                    className="input-field mt-1"
                    rows={3}
                    placeholder="Enter complete address"
                  />
                </div>

                {/* Secondary Guest Section */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Secondary Guest</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSecondaryGuest(!showSecondaryGuest)
                        if (!showSecondaryGuest) {
                          setNewGuest({
                            ...newGuest,
                            secondaryGuest: {
                              name: '',
                              phone: '',
                              idProof: '',
                              idProofType: 'AADHAR'
                            }
                          })
                        } else {
                          setNewGuest({
                            ...newGuest,
                            secondaryGuest: undefined
                          })
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showSecondaryGuest ? 'Remove Secondary Guest' : 'Add Secondary Guest'}
                    </button>
                  </div>

                  {showSecondaryGuest && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Secondary Guest Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newGuest.secondaryGuest?.name || ''}
                          onChange={(e) => setNewGuest({
                            ...newGuest,
                            secondaryGuest: {
                              ...newGuest.secondaryGuest!,
                              name: e.target.value
                            }
                          })}
                          className="input-field mt-1"
                          placeholder="Enter secondary guest name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Secondary Guest Mobile Number (Optional)
                        </label>
                        <input
                          type="tel"
                          value={newGuest.secondaryGuest?.phone || ''}
                          onChange={(e) => setNewGuest({
                            ...newGuest,
                            secondaryGuest: {
                              ...newGuest.secondaryGuest!,
                              phone: e.target.value
                            }
                          })}
                          className="input-field mt-1"
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Secondary Guest ID Proof Type
                          </label>
                          <select
                            value={newGuest.secondaryGuest?.idProofType || 'AADHAR'}
                            onChange={(e) => setNewGuest({
                              ...newGuest,
                              secondaryGuest: {
                                ...newGuest.secondaryGuest!,
                                idProofType: e.target.value
                              }
                            })}
                            className="input-field mt-1"
                          >
                            <option value="AADHAR">Aadhaar Card</option>
                            <option value="DL">Driving License</option>
                            <option value="VOTER-ID">Voter ID</option>
                            <option value="PAN">PAN Card</option>
                            <option value="PASSPORT">Passport</option>
                          </select>
                        </div>

                                                 <div>
                           <label className="block text-sm font-medium text-gray-700">
                             Secondary Guest ID Proof Number 
                           </label>
                           <input
                             type="text"
                             value={newGuest.secondaryGuest?.idProof || ''}
                             onChange={(e) => setNewGuest({
                               ...newGuest,
                               secondaryGuest: {
                                 ...newGuest.secondaryGuest!,
                                 idProof: e.target.value
                               }
                             })}
                             className="input-field mt-1"
                             placeholder="Enter ID proof number (optional)"
                           />
                         </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Extra Beds Section */}
                {!newGuest.complimentary && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Extra Beds ({extraBeds.length})</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setExtraBeds([...extraBeds, {
                          name: '',
                          phone: '',
                          idProof: '',
                          idProofType: 'AADHAR',
                          charge: 0
                        }])
                      }}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      Add Extra Bed
                    </button>
                  </div>

                  {extraBeds.length > 0 && (
                    <div className="space-y-4">
                      {extraBeds.map((bed, index) => (
                        <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-green-800">Extra Bed {index + 1}</h5>
                            <button
                              type="button"
                              onClick={() => {
                                const newExtraBeds = extraBeds.filter((_, i) => i !== index)
                                setExtraBeds(newExtraBeds)
                              }}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Guest Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={bed.name}
                                onChange={(e) => {
                                  const newExtraBeds = [...extraBeds]
                                  newExtraBeds[index].name = e.target.value
                                  setExtraBeds(newExtraBeds)
                                }}
                                className="input-field mt-1"
                                placeholder="Enter extra bed guest name"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Mobile Number (Optional)
                              </label>
                              <input
                                type="tel"
                                value={bed.phone || ''}
                                onChange={(e) => {
                                  const newExtraBeds = [...extraBeds]
                                  newExtraBeds[index].phone = e.target.value
                                  setExtraBeds(newExtraBeds)
                                }}
                                className="input-field mt-1"
                                placeholder="+91 98765 43210"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  ID Proof Type (Optional)
                                </label>
                                <select
                                  value={bed.idProofType}
                                  onChange={(e) => {
                                    const newExtraBeds = [...extraBeds]
                                    newExtraBeds[index].idProofType = e.target.value
                                    setExtraBeds(newExtraBeds)
                                  }}
                                  className="input-field mt-1"
                                >
                                  <option value="AADHAR">Aadhaar Card</option>
                                  <option value="DL">Driving License</option>
                                  <option value="VOTER-ID">Voter ID</option>
                                  <option value="PAN">PAN Card</option>
                                  <option value="PASSPORT">Passport</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  ID Proof Number (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={bed.idProof || ''}
                                  onChange={(e) => {
                                    const newExtraBeds = [...extraBeds]
                                    newExtraBeds[index].idProof = e.target.value
                                    setExtraBeds(newExtraBeds)
                                  }}
                                  className="input-field mt-1"
                                  placeholder="Enter ID proof number (optional)"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Charge (₹) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                value={bed.charge || ''}
                                onChange={(e) => {
                                  const newExtraBeds = [...extraBeds]
                                  newExtraBeds[index].charge = e.target.value ? parseInt(e.target.value) : 0
                                  setExtraBeds(newExtraBeds)
                                }}
                                className="input-field mt-1"
                                placeholder="Enter extra bed charge"
                                min="1"
                                required
                              />
                              <p className="text-xs text-gray-500 mt-1">This amount will be added to the total bill</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Room Rent Amount (₹) <span className="text-red-500">*</span>
                      {!newGuest.complimentary && <span className="text-xs text-gray-500 block">Min: ₹1800</span>}
                    </label>
                    <input
                      type="number"
                      value={newGuest.complimentary ? '' : (newGuest.totalAmount === 0 ? '' : newGuest.totalAmount)}
                      onChange={(e) => setNewGuest({...newGuest, totalAmount: e.target.value ? parseInt(e.target.value) : 0})}
                      className="input-field mt-1"
                      placeholder={newGuest.complimentary ? "Complimentary booking" : "Enter total amount (min ₹1800)"}
                      min={newGuest.complimentary ? "0" : undefined}
                      title={newGuest.complimentary ? "Complimentary booking - no charge" : "Total amount (minimum ₹1800)"}
                      disabled={newGuest.complimentary}
                    />
                    {/* UI hint retained visually above; validation warnings removed per requirement */}
                    {extraBeds.length > 0 && extraBeds.reduce((sum, bed) => sum + bed.charge, 0) > 0 && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                        <div className="text-gray-600">Base Amount: ₹{newGuest.totalAmount}</div>
                        <div className="text-green-600 font-medium">Extra Bed Charges: ₹{extraBeds.reduce((sum, bed) => sum + bed.charge, 0)}</div>
                        <div className="text-gray-800 font-semibold border-t border-green-200 pt-1 mt-1">
                          Total: ₹{newGuest.totalAmount + extraBeds.reduce((sum, bed) => sum + bed.charge, 0)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Paid Amount (₹)
                      {!newGuest.complimentary && <span className="text-xs text-gray-500 block">Paid so far</span>}
                    </label>
                    <input
                      type="number"
                      value={newGuest.complimentary ? '' : (newGuest.paidAmount === 0 ? '' : newGuest.paidAmount)}
                      onChange={(e) => setNewGuest({...newGuest, paidAmount: e.target.value ? parseInt(e.target.value) : 0})}
                      className="input-field mt-1"
                      placeholder={newGuest.complimentary ? "Complimentary booking" : "Enter paid amount"}
                      min="0"
                      title={newGuest.complimentary ? "Complimentary booking - no charge" : "Amount paid by guest"}
                      disabled={newGuest.complimentary}
                    />
                  </div>
                </div>
                <div className="flex items-center mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="complimentary"
                    checked={!!newGuest.complimentary}
                    onChange={e => {
                      setNewGuest({...newGuest, complimentary: e.target.checked, totalAmount: 0, paidAmount: 0})
                      if (e.target.checked) {
                        setExtraBeds([])
                      }
                    }}
                    className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    title="Mark as complimentary booking"
                  />
                  <label htmlFor="complimentary" className="text-sm font-medium text-gray-700">
                    Complimentary (No charge for this booking)
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddGuest}
                      className="btn-primary flex-1"
                      title="Add guest"
                    >
                      Add Guest
                    </button>
                    <button
                      onClick={() => setShowAddGuest(false)}
                      className="btn-secondary flex-1"
                      title="Cancel add guest"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && checkoutGuest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => { setShowCheckoutModal(false); setCheckoutGuest(null) }}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Check Out Guest</h3>
                <button
                  onClick={() => {
                    setShowCheckoutModal(false)
                    setCheckoutGuest(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close checkout modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Guest Information</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Name:</strong> {checkoutGuest.name}</p>
                    {checkoutGuest.secondaryGuest && (
                      <p><strong>Secondary Guest:</strong> {checkoutGuest.secondaryGuest.name}</p>
                    )}
                    {checkoutGuest.extraBeds && checkoutGuest.extraBeds.length > 0 && (
                      <div>
                        <p><strong>Extra Beds:</strong></p>
                        {checkoutGuest.extraBeds.map((bed, index) => (
                          <p key={index} className="ml-4">• {bed.name} (₹{bed.charge})</p>
                        ))}
                      </div>
                    )}
                    <p><strong>Room:</strong> {checkoutGuest.roomNumber}</p>
                    <p><strong>Check-in:</strong> {checkoutGuest.checkInDate}</p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Status</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span>₹{checkoutGuest.totalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid Amount:</span>
                      <span>₹{checkoutGuest.paidAmount}</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between font-medium">
                      <span>Balance:</span>
                      <span className={checkoutGuest.totalAmount - checkoutGuest.paidAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                        ₹{checkoutGuest.totalAmount - checkoutGuest.paidAmount}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-out Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                  <input
                      type="text"
                      value={formatDateForInput(checkoutDetails.actualCheckOutDate)}
                      onChange={(e) => handleCheckoutDateChange(e.target.value)}
                      className={`input-field mt-1 pr-10 ${checkoutDetails.actualCheckOutDate && !validateDate(checkoutDetails.actualCheckOutDate) ? 'border-red-500' : ''}`}
                      placeholder="dd-mm-yyyy"
                    required
                      title="Check-out date (dd-mm-yyyy format)"
                      maxLength={10}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModalCalendar(true)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Open calendar"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                  {checkoutDetails.actualCheckOutDate && !validateDate(checkoutDetails.actualCheckOutDate) && (
                    <p className="text-xs text-red-500 mt-1">Please enter a valid date (dd-mm-yyyy)</p>
                  )}
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Bill Breakdown</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Room Rent (including extra bed):</span>
                      <span>₹{checkoutGuest.totalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fooding Charges:</span>
                      <span>₹{checkoutDetails.additionalCharges || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laundry Charges:</span>
                      <span>₹{checkoutDetails.laundryCharges || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Late Checkout Charges:</span>
                      <span>₹{checkoutDetails.halfDayCharges || 0}</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between font-medium">
                      <span>Final Amount:</span>
                      <span>₹{checkoutDetails.finalAmount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fooding Charges (₹)</label>
                  <input
                    type="number"
                    value={checkoutDetails.additionalCharges || ''}
                    onChange={(e) => {
                      const additional = e.target.value ? parseInt(e.target.value) : 0
                      setCheckoutDetails({
                        ...checkoutDetails, 
                        additionalCharges: additional,
                        finalAmount: checkoutGuest.totalAmount + additional + checkoutDetails.laundryCharges
                      })
                    }}
                    className="input-field mt-1"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Laundry Charges (₹)</label>
                  <input
                    type="number"
                    value={checkoutDetails.laundryCharges || ''}
                    onChange={(e) => {
                      const laundry = e.target.value ? parseInt(e.target.value) : 0
                      setCheckoutDetails({
                        ...checkoutDetails, 
                        laundryCharges: laundry,
                        finalAmount: checkoutGuest.totalAmount + checkoutDetails.additionalCharges + laundry + (checkoutDetails.halfDayCharges || 0)
                      })
                    }}
                    className="input-field mt-1"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Late Checkout Charges (₹)</label>
                  <input
                    type="number"
                    value={checkoutDetails.halfDayCharges || ''}
                    onChange={(e) => {
                      const half = e.target.value ? parseInt(e.target.value) : 0
                      setCheckoutDetails({
                        ...checkoutDetails, 
                        halfDayCharges: half,
                        finalAmount: checkoutGuest.totalAmount + (checkoutDetails.additionalCharges || 0) + (checkoutDetails.laundryCharges || 0) + half
                      })
                    }}
                    className="input-field mt-1"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Final Amount (₹)</label>
                  <input
                    type="number"
                    value={checkoutDetails.finalAmount || ''}
                    onChange={(e) => setCheckoutDetails({...checkoutDetails, finalAmount: e.target.value ? parseInt(e.target.value) : 0})}
                    className="input-field mt-1"
                    placeholder="Enter final amount"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    value={checkoutDetails.paymentMethod}
                    onChange={(e) => setCheckoutDetails({...checkoutDetails, paymentMethod: e.target.value})}
                    className="input-field mt-1"
                    title="Select payment method"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={checkoutDetails.notes}
                    onChange={(e) => setCheckoutDetails({...checkoutDetails, notes: e.target.value})}
                    className="input-field mt-1"
                    rows={3}
                    placeholder="Any additional notes about the checkout..."
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={previewBill}
                      className="btn-secondary flex-1"
                      title="Preview bill without saving or bill number"
                    >
                      Preview Bill
                    </button>
                    <button
                      onClick={generateBill}
                      className="btn-secondary flex-1"
                      title="Generate and print professional bill"
                    >
                      Generate Bill
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowConfirmCheckout(true)}
                      className="btn-primary flex-1"
                    >
                      Complete Checkout
                    </button>
                    <button
                      onClick={() => {
                        setShowCheckoutModal(false)
                        setCheckoutGuest(null)
                      }}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Components */}
      <CalendarPicker
        isOpen={showCheckInCalendar}
        onClose={() => setShowCheckInCalendar(false)}
        onDateSelect={(date) => handleCalendarDateSelect('checkInDate', date)}
      />
      
      <CalendarPicker
        isOpen={showCheckOutCalendar}
        onClose={() => setShowCheckOutCalendar(false)}
        onDateSelect={(date) => handleCalendarDateSelect('checkOutDate', date)}
        minDate={newGuest.checkInDate ? new Date(newGuest.checkInDate.split('-').reverse().join('-')) : new Date()}
      />
      
      <CalendarPicker
        isOpen={showCheckoutModalCalendar}
        onClose={() => setShowCheckoutModalCalendar(false)}
        onDateSelect={handleCheckoutCalendarDateSelect}
        minDate={checkoutGuest?.checkInDate ? new Date(checkoutGuest.checkInDate.split('-').reverse().join('-')) : new Date()}
      />
      {showConfirmCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowConfirmCheckout(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-5">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-yellow-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Checkout</h3>
                  <p className="mt-1 text-sm text-gray-600">Are you sure you want to check out? This will finalize the bill.</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4 flex justify-end space-x-2">
              <button className="btn-secondary" onClick={() => setShowConfirmCheckout(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => { setShowConfirmCheckout(false); handleCheckoutSubmit(); }}
              >
                Yes, Check Out
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Notification
        type={notification.type}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={hideNotification}
        duration={notification.duration}
      />
    </div>
  )
}

export default Guests 