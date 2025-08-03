import { useState, useEffect } from 'react'
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
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutDetails, setCheckoutDetails] = useState({
    actualCheckOutDate: '',
    finalAmount: 0,
    additionalCharges: 0,
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
      complimentary: false,
      secondaryGuest: undefined
    }
  )

  // Fetch guests and rooms from backend and setup WebSocket
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch guests
        const guestsResponse = await fetch('http://localhost:3001/api/guests')
        if (!guestsResponse.ok) {
          throw new Error(`Failed to fetch guests: ${guestsResponse.status}`)
        }
        const guestsData = await guestsResponse.json()
        if (guestsData.success) {
          setGuests(guestsData.data)
        } else {
          throw new Error('Failed to fetch guests data')
        }

        // Fetch rooms
        const roomsResponse = await fetch('http://localhost:3001/api/rooms')
        if (!roomsResponse.ok) {
          throw new Error(`Failed to fetch rooms: ${roomsResponse.status}`)
        }
        const roomsData = await roomsResponse.json()
        if (roomsData.success) {
          setRooms(roomsData.data)
        } else {
          throw new Error('Failed to fetch rooms data')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data'
        setError(errorMessage)
        // Fallback to mock data if API fails
    setGuests([
      {
        id: '1',
        name: 'Rahul Sharma',
        email: 'rahul.sharma@email.com',
        phone: '+91 98765 43210',
        roomNumber: '101',
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-18',
        status: 'checked-in',
        totalAmount: 4500,
        paidAmount: 4500,
        address: '456 Koramangala, Bangalore, Karnataka',
        idProof: 'AADHAR-1234-5678-9012',
        category: 'couple'
      },
      {
        id: '2',
        name: 'Priya Patel',
        email: 'priya.patel@email.com',
        phone: '+91 87654 32109',
        roomNumber: '205',
        checkInDate: '2024-01-14',
        checkOutDate: '2024-01-17',
        status: 'checked-in',
        totalAmount: 6000,
        paidAmount: 3000,
        address: '789 Indiranagar, Bangalore, Karnataka',
        idProof: 'DL-KA-01-2020-1234567',
        category: 'corporate'
      },
      {
        id: '3',
        name: 'Amit Kumar',
        email: 'amit.kumar@email.com',
        phone: '+91 76543 21098',
        roomNumber: '302',
        checkInDate: '2024-01-20',
        checkOutDate: '2024-01-22',
        status: 'reserved',
        totalAmount: 4000,
        paidAmount: 2000,
        address: '321 Whitefield, Bangalore, Karnataka',
        idProof: 'VOTER-ID-KA-123456789',
        category: 'solo'
      },
      {
        id: '4',
        name: 'Neha Singh',
        email: 'neha.singh@email.com',
        phone: '+91 65432 10987',
        roomNumber: '108',
        checkInDate: '2024-01-12',
        checkOutDate: '2024-01-15',
        status: 'checked-out',
        totalAmount: 4500,
        paidAmount: 4500,
        address: '654 JP Nagar, Bangalore, Karnataka',
        idProof: 'AADHAR-9876-5432-1098',
        category: 'family'
      }
    ])
        showNotification('error', `Failed to fetch data: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Setup WebSocket connection for real-time updates
    const newSocket = io('http://localhost:3001')
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
      const response = await fetch(`http://localhost:3001/api/guests/${guestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'checked-in'
        }),
      })

      const data = await response.json()
      
      if (data.success) {
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
    setCheckoutDetails({
      actualCheckOutDate: new Date().toISOString().split('T')[0],
      finalAmount: guest.totalAmount,
      additionalCharges: 0,
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
      // Update guest status via backend API
      const response = await fetch(`http://localhost:3001/api/guests/${checkoutGuest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'checked-out',
            totalAmount: checkoutDetails.finalAmount,
            paidAmount: checkoutDetails.finalAmount,
          checkOutDate: convertDateToBackendFormat(checkoutDetails.actualCheckOutDate)
        }),
      })

      const data = await response.json()
      
      if (data.success) {
    // Close modal and show success
    setShowCheckoutModal(false)
    setCheckoutGuest(null)
    setCheckoutDetails({
      actualCheckOutDate: '',
      finalAmount: 0,
      additionalCharges: 0,
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

    // Validate minimum amount for non-complimentary bookings (including extra bed charges)
    const totalExtraBedCharges = extraBeds.reduce((sum, bed) => sum + bed.charge, 0)
    const totalWithExtraBeds = newGuest.totalAmount + totalExtraBedCharges
    if (!newGuest.complimentary && totalWithExtraBeds < 1800) {
      showNotification('error', 'Total amount (including extra bed charges) must be at least ₹1800 for non-complimentary bookings.')
      return
    }

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

      const response = await fetch('http://localhost:3001/api/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guestData),
      })

      const data = await response.json()
      
      if (data.success) {
        // Update room status to occupied
        const roomResponse = await fetch(`http://localhost:3001/api/rooms`, {
          method: 'GET',
        })
        const roomsData = await roomResponse.json()
        
        if (roomsData.success) {
          const room = roomsData.data.find((r: any) => r.number === newGuest.roomNumber)
          if (room) {
            await fetch(`http://localhost:3001/api/rooms/${room.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'OCCUPIED',
                currentGuest: newGuest.name,
                checkInDate: guestData.checkInDate,
                checkOutDate: guestData.checkOutDate
              }),
            })
          }
        }

        // Refresh guests list
        const refreshResponse = await fetch('http://localhost:3001/api/guests')
        const refreshData = await refreshResponse.json()
        if (refreshData.success) {
          setGuests(refreshData.data)
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
                      <button className="text-gray-400 hover:text-gray-600" title="More actions">
                        <MoreVertical className="h-4 w-4" />
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
                      const selectedRoom = rooms.find(room => room.number === e.target.value)
                      setNewGuest({
                        ...newGuest, 
                        roomNumber: e.target.value,
                        category: selectedRoom ? selectedRoom.category.toLowerCase() as GuestCategory : 'couple'
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
                    title="Room type (auto-selected based on room)"
                    aria-label="Room Type"
                    disabled={!newGuest.roomNumber}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {newGuest.roomNumber && (
                    <p className="text-xs text-gray-500 mt-1">Auto-selected based on room category</p>
                  )}
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
                      min={newGuest.complimentary ? "0" : "1800"}
                      title={newGuest.complimentary ? "Complimentary booking - no charge" : "Total amount (minimum ₹1800)"}
                      disabled={newGuest.complimentary}
                    />
                    {!newGuest.complimentary && newGuest.totalAmount > 0 && newGuest.totalAmount < 1800 && extraBeds.length === 0 && (
                      <p className="text-red-500 text-xs mt-1">Minimum amount required is ₹1800</p>
                    )}
                    {!newGuest.complimentary && extraBeds.length > 0 && (newGuest.totalAmount + extraBeds.reduce((sum, bed) => sum + bed.charge, 0)) > 0 && (newGuest.totalAmount + extraBeds.reduce((sum, bed) => sum + bed.charge, 0)) < 1800 && (
                      <p className="text-red-500 text-xs mt-1">Total amount (including extra bed charges) must be at least ₹1800</p>
                    )}
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
                    <p><strong>Original Amount:</strong> ₹{checkoutGuest.totalAmount}</p>
                    <p><strong>Paid Amount:</strong> ₹{checkoutGuest.paidAmount}</p>
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
                        finalAmount: checkoutGuest.totalAmount + additional
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
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCheckoutSubmit}
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