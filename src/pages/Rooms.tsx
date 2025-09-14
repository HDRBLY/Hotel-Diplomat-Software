import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Bed, 
  Wifi, 
  Tv,
  Coffee,
  Car,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Heart,
  Briefcase,
  User,
  RefreshCw
} from 'lucide-react'
import { useNotification } from '../components/Notification'
import { useAuth } from '../components/AuthContext'
import Notification from '../components/Notification'
import { useRef } from 'react'
import { useCallback } from 'react'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

interface Room {
  id: string
  number: string
  type: 'standard' | 'deluxe' | 'suite' | 'presidential'
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'cleaning'
  floor: number
  price: number
  amenities: string[]
  currentGuest?: string
  checkInDate?: string
  checkOutDate?: string
  lastCleaned: string
  notes: string
  category: 'couple' | 'corporate' | 'solo' | 'family'
}

// Add ShiftEvent type and state
interface ShiftEvent {
  fromRoom: string
  toRoom: string
  guest: string
  date: string // ISO string
  time: string
  reason: string
  authorizedBy: string
  notes: string
}

const Rooms = () => {
  const { hasPermission } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'couple' | 'corporate' | 'solo' | 'family'>('all')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [showEditRoom, setShowEditRoom] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutRoom, setCheckoutRoom] = useState<Room | null>(null)
  const [showConfirmCheckout, setShowConfirmCheckout] = useState(false)
  const [checkoutDetails, setCheckoutDetails] = useState({
    guestName: '',
    actualCheckOutDate: '',
    finalAmount: 0,
    additionalCharges: 0,
    laundryCharges: 0,
    halfDayCharges: 0,
    paymentMethod: 'CASH',
    notes: '',
    guestTotalAmount: 0,
    guestPaidAmount: 0,
    guestBalance: 0
  })
  const [showRoomShiftModal, setShowRoomShiftModal] = useState(false)
  const [shiftFromRoom, setShiftFromRoom] = useState<Room | null>(null)
  const [shiftDetails, setShiftDetails] = useState({
    toRoomNumber: '',
    shiftDate: '',
    shiftTime: '',
    reason: '',
    authorizedBy: '',
    notes: ''
  })
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false)
  const [statusChangeRoom, setStatusChangeRoom] = useState<Room | null>(null)
  const [newStatus, setNewStatus] = useState<Room['status']>('available')
  const { notification, showNotification, hideNotification } = useNotification()
  const [newRoom, setNewRoom] = useState({
    number: '',
    type: 'standard' as Room['type'],
    floor: 1,
    price: 1500,
    amenities: [] as string[],
    status: 'available' as Room['status'],
    notes: '',
    category: 'couple' as Room['category']
  })
  const [showCheckoutReminder, setShowCheckoutReminder] = useState(false)
  const [checkoutReminderRooms, setCheckoutReminderRooms] = useState<Room[]>([])
  const reminderTimeoutRef = useRef<number | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [shiftEvents, setShiftEvents] = useState<ShiftEvent[]>([])
  const [shiftFilter, setShiftFilter] = useState<'today' | '7days' | 'custom'>('today')
  const [customRange, setCustomRange] = useState<{from: string, to: string}>({from: '', to: ''})
  const [showShiftedRoomsModal, setShowShiftedRoomsModal] = useState(false)
  const [shiftSearch, setShiftSearch] = useState('')
  const [shiftDate, setShiftDate] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      console.log('Manual refresh triggered...')
      const response = await fetch(`${BACKEND_URL}/api/rooms`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.success) {
        console.log('Manual refresh successful:', data.data)
        setRooms(data.data)
        showNotification('success', 'Rooms data refreshed successfully!')
      } else {
        throw new Error('API returned success: false')
      }
    } catch (error) {
      console.error('Manual refresh failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh rooms data'
      setError(errorMessage)
      showNotification('error', errorMessage)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Available amenities
  const availableAmenities = [
    { id: 'wifi', label: 'WiFi', icon: 'wifi' },
    { id: 'tv', label: 'TV', icon: 'tv' },
    { id: 'ac', label: 'AC', icon: 'ac' },
    { id: 'coffee', label: 'Coffee Maker', icon: 'coffee' },
    { id: 'balcony', label: 'Balcony', icon: 'balcony' },
    { id: 'jacuzzi', label: 'Jacuzzi', icon: 'jacuzzi' },
    { id: 'butler', label: 'Butler Service', icon: 'butler' }
  ]

  // Fetch rooms from backend and setup WebSocket
  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true)
      setError(null)
      try {
        console.log('Fetching rooms from API...')
        const response = await fetch(`${BACKEND_URL}/api/rooms`)
        console.log('API Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('API Response data:', data)
        
        if (data.success) {
          console.log('Setting rooms data:', data.data)
          setRooms(data.data)
        } else {
          console.error('API returned success: false')
          throw new Error('API returned success: false')
        }
      } catch (error) {
        console.error('Error fetching rooms:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch rooms'
        setError(errorMessage)
        setRooms([])
        showNotification('error', `Failed to fetch rooms: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRooms()

    // Setup WebSocket connection for real-time updates
    const newSocket = io(BACKEND_URL)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Connected to backend for real-time room updates')
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from backend')
    })

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    newSocket.on('room_updated', (updatedRoom) => {
      console.log('Received room_updated event:', updatedRoom)
      setRooms(prev => prev.map(room => 
        room.id === updatedRoom.id ? updatedRoom : room
      ))
    })

    newSocket.on('guest_created', () => {
      console.log('Received guest_created event, refreshing rooms...')
      // Refresh rooms when a new guest is added
      fetchRooms()
    })

    newSocket.on('guest_checked_out', () => {
      // Refresh rooms when a guest is checked out
      fetchRooms()
    })

    newSocket.on('room_shifted', (shiftData) => {
      console.log('Received room_shifted event:', shiftData)
      // Refresh rooms data when a room shift happens
      fetchRooms()
    })

    return () => {
      if (newSocket) {
        newSocket.disconnect()
        newSocket.removeAllListeners()
      }
    }
  }, [])

  // 11am daily reminder effect
  useEffect(() => {
    if (!hasPermission('rooms:view')) return
    function scheduleReminder() {
      const now = new Date()
      const next11am = new Date()
      next11am.setHours(11, 0, 0, 0)
      if (now > next11am) {
        next11am.setDate(next11am.getDate() + 1)
      }
      const msUntil11am = next11am.getTime() - now.getTime()
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current)
      reminderTimeoutRef.current = window.setTimeout(() => {
        const occupied = rooms.filter(r => r.status === 'occupied')
        if (occupied.length > 0) {
          setCheckoutReminderRooms(occupied)
          setShowCheckoutReminder(true)
        }
        scheduleReminder() // reschedule for next day
      }, msUntil11am)
    }
    scheduleReminder()
    return () => {
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current)
    }
  }, [rooms, hasPermission])

  // Manual trigger for demo/testing (remove in prod)
  // useEffect(() => { setShowCheckoutReminder(true); setCheckoutReminderRooms(rooms.filter(r => r.status === 'occupied')); }, [rooms])

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.includes(searchTerm) ||
                         room.currentGuest?.toLowerCase().includes(searchTerm.toLowerCase())
    // If 'all' is selected, show all rooms (regardless of status or category)
    if (categoryFilter === 'all') {
      return matchesSearch && (statusFilter === 'all' || room.status === statusFilter) && (typeFilter === 'all' || room.type === typeFilter)
    }
    // If a category is selected, show only occupied rooms of that category
    const matchesCategory = room.category === categoryFilter
    const matchesOccupied = room.status === 'occupied'
    return matchesSearch && matchesCategory && matchesOccupied && (typeFilter === 'all' || room.type === typeFilter)
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-100'
      case 'occupied':
        return 'text-red-600 bg-red-100'
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100'
      case 'reserved':
        return 'text-blue-600 bg-blue-100'
      case 'cleaning':
        return 'text-purple-600 bg-purple-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'occupied':
        return <Users className="h-4 w-4 text-red-500" />
      case 'maintenance':
        return <XCircle className="h-4 w-4 text-yellow-500" />
      case 'reserved':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'cleaning':
        return <Tv className="h-4 w-4 text-purple-500" />
      default:
        return <Bed className="h-4 w-4 text-gray-500" />
    }
  }

  const getAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case 'wifi':
        return <Wifi className="h-4 w-4 text-blue-500" />
      case 'tv':
        return <Tv className="h-4 w-4 text-purple-500" />
      case 'ac':
        return <Tv className="h-4 w-4 text-purple-500" />
      case 'coffee':
        return <Coffee className="h-4 w-4 text-brown-500" />
      case 'balcony':
        return <Car className="h-4 w-4 text-green-500" />
      case 'jacuzzi':
        return <Tv className="h-4 w-4 text-purple-500" />
      case 'butler':
        return <Users className="h-4 w-4 text-blue-500" />
      default:
        return <Bed className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'standard':
        return 'bg-gray-100 text-gray-800'
      case 'deluxe':
        return 'bg-blue-100 text-blue-800'
      case 'suite':
        return 'bg-purple-100 text-purple-800'
      case 'presidential':
        return 'bg-gold-100 text-gold-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: Room['category']) => {
    switch (category) {
      case 'couple':
        return <Heart className="h-4 w-4 text-pink-500" />
      case 'corporate':
        return <Briefcase className="h-4 w-4 text-blue-600" />
      case 'solo':
        return <User className="h-4 w-4 text-gray-600" />
      case 'family':
        return <Users className="h-4 w-4 text-yellow-600" />
      default:
        return <Bed className="h-4 w-4 text-gray-400" />
    }
  }
  const getCategoryColor = (category: Room['category']) => {
    switch (category) {
      case 'couple':
        return 'bg-pink-100 text-pink-700'
      case 'corporate':
        return 'bg-blue-100 text-blue-700'
      case 'solo':
        return 'bg-gray-100 text-gray-700'
      case 'family':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const handleStatusChange = async (roomId: string, newStatus: Room['status']) => {
    if (!hasPermission('rooms:edit')) {
      showNotification('error', 'You do not have permission to change room status.')
      return
    }

    const room = rooms.find(r => r.id === roomId)
    if (!room) return

    // Prevent changing status of occupied rooms
    if (room.status === 'occupied') {
      showNotification('error', 'Cannot change status of occupied room. Please check out the guest first.')
      return
    }

    // Prevent setting status to occupied without a guest
    if (newStatus === 'occupied' && !room.currentGuest) {
      showNotification('error', 'Cannot set room status to occupied without a guest. Please assign a guest first.')
      return
    }

    try {
      // Call backend API to update room status
      const response = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update room status')
      }

      const result = await response.json()
      
      if (result.success) {
        // Update local state with the response from backend
        setRooms(rooms.map(room => 
          room.id === roomId 
            ? { ...room, status: newStatus }
            : room
        ))
        
        showNotification('success', `Room ${room.number} status updated to ${newStatus}`)
      } else {
        throw new Error(result.message || 'Failed to update room status')
      }
    } catch (error) {
      console.error('Error updating room status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update room status'
      showNotification('error', errorMessage)
    }
  }

  const handleAddRoom = async () => {
    if (!hasPermission('rooms:create')) {
      showNotification('error', 'You do not have permission to add rooms.')
      return
    }

    if (!newRoom.number || !newRoom.type) {
      showNotification('error', 'Please fill all mandatory fields (Room Number, Type)')
      return
    }

    // Check if room number already exists
    const isRoomExists = rooms.some(room => room.number === newRoom.number)
    if (isRoomExists) {
      showNotification('error', 'Room number already exists. Please use a different room number.')
      return
    }

    // Prevent creating room with occupied status
    if (newRoom.status === 'occupied') {
      showNotification('error', 'Cannot create room with occupied status. Please set status to available, maintenance, reserved, or cleaning.')
      return
    }

    try {
      // Call backend API to add room
      const response = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: newRoom.number,
          type: newRoom.type,
          status: newRoom.status,
          floor: newRoom.floor,
          price: newRoom.price,
          amenities: newRoom.amenities,
          notes: newRoom.notes,
          category: newRoom.category
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add room')
      }

      const result = await response.json()
      
      if (result.success) {
        // Add the new room to local state
        setRooms([...rooms, result.data])
        
        // Reset form
        setNewRoom({
          number: '',
          type: 'standard',
          floor: 1,
          price: 1500,
          amenities: [],
          status: 'available',
          notes: '',
          category: 'couple'
        })
        
        setShowAddRoom(false)
        showNotification('success', 'Room added successfully!')
      } else {
        throw new Error(result.message || 'Failed to add room')
      }
    } catch (error) {
      console.error('Error adding room:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add room'
      showNotification('error', errorMessage)
    }
  }

  const handleAmenityToggle = (amenityId: string) => {
    setNewRoom(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }))
  }

  const handleEditRoom = (room: Room) => {
    if (!hasPermission('rooms:edit')) {
      showNotification('error', 'You do not have permission to edit rooms.')
      return
    }

    // Check if room is occupied
    if (room.status === 'occupied') {
      showNotification('error', 'Cannot edit occupied room. Please check out the guest first before editing room details.')
      return
    }
    
    setEditingRoom(room)
    setShowEditRoom(true)
  }

  const handleUpdateRoom = async () => {
    if (!editingRoom) return

    // Check if trying to set status to occupied without a guest
    if (editingRoom.status === 'occupied' && !editingRoom.currentGuest) {
      showNotification('error', 'Cannot set room status to occupied without a guest. Please assign a guest first.')
      return
    }

    // Check if room number already exists (excluding the current room being edited)
    const isRoomExists = rooms.some(room => 
      room.number === editingRoom.number && room.id !== editingRoom.id
    )
    if (isRoomExists) {
      showNotification('error', 'Room number already exists. Please use a different room number.')
      return
    }

    try {
      // Call backend API to update room
      const response = await fetch(`${BACKEND_URL}/api/rooms/${editingRoom.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: editingRoom.number,
          type: editingRoom.type,
          status: editingRoom.status,
          floor: editingRoom.floor,
          price: editingRoom.price,
          amenities: editingRoom.amenities,
          notes: editingRoom.notes,
          category: editingRoom.category
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update room')
      }

      const result = await response.json()
      
      if (result.success) {
        // Update local state with the response from backend
        setRooms(rooms.map(room => 
          room.id === editingRoom.id ? result.data : room
        ))
        
        setShowEditRoom(false)
        setEditingRoom(null)
        showNotification('success', 'Room updated successfully!')
      } else {
        throw new Error(result.message || 'Failed to update room')
      }
    } catch (error) {
      console.error('Error updating room:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update room'
      showNotification('error', errorMessage)
    }
  }

  const handleEditAmenityToggle = (amenityId: string) => {
    if (!editingRoom) return
    
    setEditingRoom(prev => {
      if (!prev) return prev
      return {
        ...prev,
        amenities: prev.amenities.includes(amenityId)
          ? prev.amenities.filter(id => id !== amenityId)
          : [...prev.amenities, amenityId]
      }
    })
  }

  const handleCheckoutRoom = async (room: Room) => {
    if (!hasPermission('rooms:edit')) {
      showNotification('error', 'You do not have permission to check out rooms.')
      return
    }

    if (room.status !== 'occupied') {
      showNotification('error', 'Only occupied rooms can be checked out.')
      return
    }
    
    try {
      // Fetch guest data to get the actual total amount (including extra bed charges)
      const response = await fetch(`${BACKEND_URL}/api/guests`)
      const guestsData = await response.json()
      
      if (!guestsData.success) {
        throw new Error('Failed to fetch guests')
      }

      const guest = guestsData.data.find((g: any) => 
        g.roomNumber === room.number && g.status === 'checked-in'
      )

      if (!guest) {
        showNotification('error', 'No active guest found for this room')
        return
      }

      // Use guest's total amount as base (includes room rent + extra bed charges)
      const baseAmount = guest.totalAmount || room.price
      
      setCheckoutRoom(room)
      // Format today's date in dd-mm-yyyy format
      const today = new Date()
      const day = today.getDate().toString().padStart(2, '0')
      const month = (today.getMonth() + 1).toString().padStart(2, '0')
      const year = today.getFullYear().toString()
      const formattedToday = `${day}-${month}-${year}`
      
      setCheckoutDetails({
        guestName: room.currentGuest || '',
        actualCheckOutDate: formattedToday,
        finalAmount: baseAmount, // Use guest's total amount as base
        additionalCharges: 0,
        laundryCharges: 0,
        halfDayCharges: 0,
        paymentMethod: 'CASH',
        notes: '',
        guestTotalAmount: guest.totalAmount,
        guestPaidAmount: guest.paidAmount,
        guestBalance: guest.totalAmount - guest.paidAmount
      })
      setShowCheckoutModal(true)
    } catch (error) {
      console.error('Error fetching guest data:', error)
      showNotification('error', 'Failed to load guest information. Please try again.')
    }
  }

  // Bill generation function
  const generateBill = async () => {
    if (!checkoutRoom) return

    try {
      // Get bill number from backend
      const billResponse = await fetch(`${BACKEND_URL}/api/bill-number`)
      const billData = await billResponse.json()
      const billNumber = billData.success ? billData.billNumber : '0001'

      // Find the guest for this room
      const response = await fetch(`${BACKEND_URL}/api/guests`)
      const guestsData = await response.json()
      
      if (!guestsData.success) {
        throw new Error('Failed to fetch guests')
      }

      const guest = guestsData.data.find((g: any) => 
        g.roomNumber === checkoutRoom.number && g.status === 'checked-in'
      )

      if (!guest) {
        showNotification('error', 'No active guest found for this room')
        return
      }



      // Format amount in words (set after computing totalAmount)
      let amountInWords = ''

      // Get current date and time for checkout
      const now = new Date()
      const billTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      // Get actual check-in time from guest data
      const checkInTime = new Date(guest.createdAt || guest.updatedAt || Date.now())
      const formattedCheckInTime = checkInTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      // Calculate number of days properly
      // Convert dates to proper format for calculation
      const checkInDateStr = guest.checkInDate // Format: yyyy-mm-dd
      const checkOutDateStr = checkoutDetails.actualCheckOutDate // Format: dd-mm-yyyy
      
      // Parse check-in date (yyyy-mm-dd)
      const checkInParts = checkInDateStr.split('-')
      const checkInDate = new Date(parseInt(checkInParts[0]), parseInt(checkInParts[1]) - 1, parseInt(checkInParts[2]))
      
      // Parse check-out date (dd-mm-yyyy)
      const checkOutParts = checkOutDateStr.split('-')
      const checkOutDate = new Date(parseInt(checkOutParts[2]), parseInt(checkOutParts[1]) - 1, parseInt(checkOutParts[0]))
      
      // Calculate days difference - if same day, count as 1 day
      let daysDiff = 1
      if (checkOutDate.getTime() !== checkInDate.getTime()) {
        const timeDiff = checkOutDate.getTime() - checkInDate.getTime()
        daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
      }

      // Get room price (per-day base rate) from rooms data
      const roomsResponse = await fetch(`${BACKEND_URL}/api/rooms`)
      const roomsData = await roomsResponse.json()
      const room = roomsData.data.find((r: any) => r.number === guest.roomNumber)
      const roomBasePricePerDay: number = room && typeof room.price === 'number' ? room.price : 0

      // Prefer per-day amount as shown in checkout modal: "Room Rent (including extra bed)"
      const perDayFromCheckout = Math.max(0,
        (checkoutDetails.finalAmount || 0)
        - (checkoutDetails.additionalCharges || 0)
        - (checkoutDetails.laundryCharges || 0)
        - (checkoutDetails.halfDayCharges || 0)
      )

      // Establish pricePerDay and extraBedCharges according to the chosen source
      let pricePerDay = 0
      let extraBedCharges = 0

      if (perDayFromCheckout > 0) {
        // Use the exact per-day room rent (including extra bed) from checkout form
        pricePerDay = perDayFromCheckout
        extraBedCharges = 0 // already included in per-day
      } else {
        // Fallback to room base price or derived rate from guest totals
        const fallbackExtra = guest.extraBeds ? guest.extraBeds.reduce((sum: number, bed: any) => sum + bed.charge, 0) : 0
        const derivedPerDay = Math.round(Math.max(0, (guest.totalAmount - fallbackExtra)) / Math.max(1, daysDiff))
        pricePerDay = roomBasePricePerDay > 0 ? roomBasePricePerDay : derivedPerDay
        extraBedCharges = fallbackExtra
      }

      // Room rent for the stay is per-day base multiplied by number of days
      const roomRent = pricePerDay * daysDiff
      const totalRoomCharges = roomRent + extraBedCharges

      // Calculate tax breakdown for room rent (12% GST: 6% CGST + 6% SGST)
      const roomRentTaxableValue = roomRent / 1.12 // Remove GST to get base amount
      const roomRentCgst = roomRentTaxableValue * 0.06
      const roomRentSgst = roomRentTaxableValue * 0.06

      // Calculate tax breakdown for extra bed charges (12% GST: 6% CGST + 6% SGST)
      const extraBedTaxableValue = extraBedCharges / 1.12
      const extraBedCgst = extraBedTaxableValue * 0.06
      const extraBedSgst = extraBedTaxableValue * 0.06

      // Normalize optional charges to numbers to avoid NaN
      const addl = Number(checkoutDetails.additionalCharges) || 0
      const laundry = Number(checkoutDetails.laundryCharges) || 0
      const halfDay = Number(checkoutDetails.halfDayCharges) || 0

      // Calculate tax breakdown for fooding charges (5% GST: 2.5% CGST + 2.5% SGST)
      const foodingTaxableValue = addl > 0 ? addl / 1.05 : 0
      const foodingCgst = foodingTaxableValue * 0.025
      const foodingSgst = foodingTaxableValue * 0.025

      // Calculate tax breakdown for laundry charges (5% GST: 2.5% CGST + 2.5% SGST)
      const laundryTaxableValue = laundry > 0 ? laundry / 1.05 : 0
      const laundryCgst = laundryTaxableValue * 0.025
      const laundrySgst = laundryTaxableValue * 0.025

      // Late checkout charges are treated as room rent (12% GST)
      const halfDayTaxableValue = halfDay > 0 ? halfDay / 1.12 : 0
      const halfDayCgst = halfDayTaxableValue * 0.06
      const halfDaySgst = halfDayTaxableValue * 0.06

      // Total tax values
      const taxableValue = roomRentTaxableValue + extraBedTaxableValue + foodingTaxableValue + laundryTaxableValue + halfDayTaxableValue
      const cgst = roomRentCgst + extraBedCgst + foodingCgst + laundryCgst + halfDayCgst
      const sgst = roomRentSgst + extraBedSgst + foodingSgst + laundrySgst + halfDaySgst

      // Calculate total amount (sum of all individual row totals)
      const totalAmount = (Number(roomRent) || 0) + (Number(extraBedCharges) || 0) + addl + laundry + halfDay

      // Rounded total for display/words
      const totalAmountDisplay = Math.round(totalAmount)

      // Now compute amount in words based on the grand total
      amountInWords = numberToIndianWords(totalAmountDisplay || 0)

      // Format arrival date properly (convert yyyy-mm-dd to dd-mm-yyyy)
      const arrivalDateParts = guest.checkInDate.split('-')
      const formattedArrivalDate = `${arrivalDateParts[2]}-${arrivalDateParts[1]}-${arrivalDateParts[0]}`

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
                <div class="info-row editable" contenteditable="false">Name: ${guest.name}</div>
                <div class="info-row editable" contenteditable="false">Company: </div>
                <div class="info-row editable" contenteditable="false">Designation: </div>
                <div class="info-row editable" contenteditable="false">Address: ${guest.address || 'BAREILLY'}</div>
                <div class="info-row editable" contenteditable="false">Phone No: ${guest.phone}</div>
                <div class="info-row editable" contenteditable="false">Email ID: ${guest.email || ''}</div>
                <div class="info-row editable" contenteditable="false">GST NO: </div>
              </div>
              <div class="stay-details">
                <div class="section-title">Stay Details:</div>
                <div class="info-row editable" contenteditable="false">Date of Arrival: ${formattedArrivalDate}</div>
                <div class="info-row editable" contenteditable="false">Date of Departure: ${checkoutDetails.actualCheckOutDate}</div>
                <div class="info-row editable" contenteditable="false">Bill No: ${billNumber}</div>
                <div class="info-row editable" contenteditable="false">ROOM NO: ${guest.roomNumber}</div>
                <div class="info-row editable" contenteditable="false">PAX: ${1 + (guest.secondaryGuest ? 1 : 0) + (guest.extraBeds ? guest.extraBeds.length : 0)}</div>
                <div class="info-row editable" contenteditable="false">Plan: ${guest.plan || 'EP'}</div>
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
                <td class="editable" contenteditable="false">${guest.roomNumber}</td>
                <td class="editable" contenteditable="false">${guest.name}</td>
                <td class="editable" contenteditable="false">${daysDiff}</td>
                <td class="editable" contenteditable="false">₹${pricePerDay}</td>
                <td class="editable" contenteditable="false">₹${roomRentTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${roomRentCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${roomRentSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${roomRent}</td>
              </tr>
              ${extraBedCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Extra Bed Charges</td>
                <td class="editable" contenteditable="false">₹${extraBedTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${extraBedCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${extraBedSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${extraBedCharges}</td>
              </tr>
              ` : ''}
              ${checkoutDetails.additionalCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Fooding Charges</td>
                <td class="editable" contenteditable="false">₹${foodingTaxableValue.toFixed(2)}</td>
                <td>5%</td>
                <td class="editable" contenteditable="false">₹${foodingCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${foodingSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${checkoutDetails.additionalCharges}</td>
              </tr>
              ` : ''}
              ${checkoutDetails.laundryCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Laundry Charges</td>
                <td class="editable" contenteditable="false">₹${laundryTaxableValue.toFixed(2)}</td>
                <td>5%</td>
                <td class="editable" contenteditable="false">₹${laundryCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${laundrySgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${checkoutDetails.laundryCharges}</td>
              </tr>
              ` : ''}
              ${checkoutDetails.halfDayCharges > 0 ? `
              <tr>
                <td colspan="4" class="editable" contenteditable="false">Late Checkout Charges</td>
                <td class="editable" contenteditable="false">₹${halfDayTaxableValue.toFixed(2)}</td>
                <td>12%</td>
                <td class="editable" contenteditable="false">₹${halfDayCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${halfDaySgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${checkoutDetails.halfDayCharges}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td colspan="4">TOTAL</td>
                <td class="editable" contenteditable="false">₹${taxableValue.toFixed(2)}</td>
                <td></td>
                <td class="editable" contenteditable="false">₹${cgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${sgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${totalAmountDisplay}</td>
              </tr>
            </tbody>
          </table>

          <div style="text-align: right; font-size: 11px; margin-top: 4px;">
            <span>Round Off:</span> <span class="editable" contenteditable="false">₹${(totalAmountDisplay - totalAmount).toFixed(2)}</span>
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

  // Helper function to convert number to words
  const numberToIndianWords = (amount: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

    const twoDigits = (num: number): string => {
      if (num === 0) return ''
      if (num < 20) return ones[num]
      const t = Math.floor(num / 10)
      const o = num % 10
      return tens[t] + (o ? ' ' + ones[o] : '')
    }

    const threeDigits = (num: number): string => {
      const h = Math.floor(num / 100)
      const r = num % 100
      let str = ''
      if (h) str += ones[h] + ' HUNDRED'
      if (h && r) str += ' AND '
      if (r) str += twoDigits(r)
      return str
    }

    const n = Math.max(0, Math.round(Number(amount) || 0))
    if (n === 0) return 'ZERO'

    const crores = Math.floor(n / 10000000)
    const lakhs = Math.floor((n % 10000000) / 100000)
    const thousands = Math.floor((n % 100000) / 1000)
    const hundreds = n % 1000

    let words: string[] = []
    if (crores) words.push(twoDigits(crores) + ' CRORE')
    if (lakhs) words.push(twoDigits(lakhs) + ' LAKH')
    if (thousands) words.push(twoDigits(thousands) + ' THOUSAND')
    if (hundreds) words.push(threeDigits(hundreds))

    return words.join(' ').trim() || 'RUPEES'
  }

  // Backward-compatible alias
  const numberToWords = (num: number): string => numberToIndianWords(num)

  const handleCheckoutSubmit = async () => {
    if (!checkoutRoom) return

    // Validation
    if (!checkoutDetails.actualCheckOutDate) {
      showNotification('error', 'Please select checkout date')
      return
    }

    if (checkoutDetails.finalAmount < 0) {
      showNotification('error', 'Final amount cannot be negative')
      return
    }

    try {
      // Find the guest for this room
      const response = await fetch(`${BACKEND_URL}/api/guests`)
      const guestsData = await response.json()
      
      if (!guestsData.success) {
        throw new Error('Failed to fetch guests')
      }

      const guest = guestsData.data.find((g: any) => 
        g.roomNumber === checkoutRoom.number && g.status === 'checked-in'
      )

      if (!guest) {
        showNotification('error', 'No active guest found for this room')
        return
      }

      // Update guest status to checked-out
      const updateResponse = await fetch(`${BACKEND_URL}/api/guests/${guest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'checked-out',
          checkOutDate: checkoutDetails.actualCheckOutDate,
          totalAmount: checkoutDetails.finalAmount,
          paidAmount: checkoutDetails.finalAmount,
          notes: checkoutDetails.notes
        })
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update guest status')
      }

      // Close modal and show success
      setShowCheckoutModal(false)
      setCheckoutRoom(null)
      setCheckoutDetails({
        guestName: '',
        actualCheckOutDate: '',
        finalAmount: 0,
        additionalCharges: 0,
        laundryCharges: 0,
        halfDayCharges: 0,
        paymentMethod: 'CASH',
        notes: '',
        guestTotalAmount: 0,
        guestPaidAmount: 0,
        guestBalance: 0
      })
      
      showNotification('success', `Room ${checkoutRoom.number} checked out successfully!`)
      
      // Refresh rooms data
      handleManualRefresh()
      
    } catch (error) {
      console.error('Checkout error:', error)
      showNotification('error', 'Failed to checkout room. Please try again.')
    }
  }

  const handleRoomShift = (room: Room) => {
    if (!hasPermission('rooms:edit')) {
      showNotification('error', 'You do not have permission to shift rooms.')
      return
    }

    if (room.status !== 'occupied') {
      showNotification('error', 'Only occupied rooms can have guests shifted.')
      return
    }
    
    setShiftFromRoom(room)
    setShiftDetails({
      toRoomNumber: '',
      shiftDate: new Date().toISOString().split('T')[0],
      shiftTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      reason: '',
      authorizedBy: '',
      notes: ''
    })
    setShowRoomShiftModal(true)
  }

  const handleRoomShiftSubmit = async () => {
    if (!shiftFromRoom) return

    // Validation
    if (!shiftDetails.toRoomNumber) {
      showNotification('error', 'Please select destination room number')
      return
    }

    if (!shiftDetails.shiftDate) {
      showNotification('error', 'Please select shift date')
      return
    }

    if (!shiftDetails.shiftTime) {
      showNotification('error', 'Please select shift time')
      return
    }

    if (!shiftDetails.reason) {
      showNotification('error', 'Please provide reason for room shift')
      return
    }

    if (!shiftDetails.authorizedBy) {
      showNotification('error', 'Please enter who authorized this shift')
      return
    }

    // Check if destination room exists and is available
    const destinationRoom = rooms.find(r => r.number === shiftDetails.toRoomNumber)
    if (!destinationRoom) {
      showNotification('error', 'Destination room does not exist')
      return
    }

    if (destinationRoom.status !== 'available') {
      showNotification('error', 'Destination room is not available')
      return
    }

    // Check if destination room is not the same as source room
    if (shiftDetails.toRoomNumber === shiftFromRoom.number) {
      showNotification('error', 'Cannot shift to the same room')
      return
    }

    try {
      // Normalize destination input to avoid whitespace issues in production
      const payload = { ...shiftDetails, toRoomNumber: (shiftDetails.toRoomNumber || '').trim() }
      // Call the API to shift the room
      const response = await fetch(`${BACKEND_URL}/api/rooms/${shiftFromRoom.id}/shift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to shift room')
      }

      const result = await response.json()

      // Close modal and show success
      setShowRoomShiftModal(false)
      setShiftFromRoom(null)
      setShiftDetails({
        toRoomNumber: '',
        shiftDate: '',
        shiftTime: '',
        reason: '',
        authorizedBy: '',
        notes: ''
      })
      
      showNotification('success', result.message)
      
      // Record the shift event
      setShiftEvents(prev => [
        {
          fromRoom: shiftFromRoom.number,
          toRoom: shiftDetails.toRoomNumber,
          guest: shiftFromRoom.currentGuest || '',
          date: shiftDetails.shiftDate,
          time: shiftDetails.shiftTime,
          reason: shiftDetails.reason,
          authorizedBy: shiftDetails.authorizedBy,
          notes: shiftDetails.notes
        },
        ...prev
      ])
      
      // Refresh rooms data to get updated state (but don't show notification)
      const refreshResponse = await fetch(`${BACKEND_URL}/api/rooms`)
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        if (refreshData.success) {
          setRooms(refreshData.data)
        }
      }
      
    } catch (error) {
      console.error('Room shift error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to shift room. Please try again.'
      showNotification('error', errorMessage)
    }
  }

  const handleStatusChangeClick = (room: Room) => {
    if (!hasPermission('rooms:edit')) {
      showNotification('error', 'You do not have permission to change room status.')
      return
    }

    if (room.status === 'occupied') {
      showNotification('error', 'Cannot change status of occupied room. Please check out the guest first.')
      return
    }

    setStatusChangeRoom(room)
    setNewStatus(room.status)
    setShowStatusChangeModal(true)
  }

  const handleStatusChangeSubmit = async () => {
    if (!statusChangeRoom) return

    // Validation
    if (!newStatus) {
      showNotification('error', 'Please select a status')
      return
    }

    // Prevent setting status to occupied without a guest
    if (newStatus === 'occupied' && !statusChangeRoom.currentGuest) {
      showNotification('error', 'Cannot set room status to occupied without a guest. Please assign a guest first.')
      return
    }

    try {
      // Call backend API to update room status
      const response = await fetch(`${BACKEND_URL}/api/rooms/${statusChangeRoom.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update room status')
      }

      const result = await response.json()
      
      if (result.success) {
        // Update local state with the response from backend
        setRooms(rooms.map(room => 
          room.id === statusChangeRoom.id 
            ? { ...room, status: newStatus }
            : room
        ))

        // Close modal and show success
        setShowStatusChangeModal(false)
        setStatusChangeRoom(null)
        setNewStatus('available')
        
        showNotification('success', `Room ${statusChangeRoom.number} status updated to ${newStatus}`)
      } else {
        throw new Error(result.message || 'Failed to update room status')
      }
    } catch (error) {
      console.error('Error updating room status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update room status'
      showNotification('error', errorMessage)
    }
  }

  // Fetch room shifts data
  useEffect(() => {
    const fetchRoomShifts = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/room-shifts?limit=100`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setShiftEvents(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch room shifts:', error)
      }
    }

    fetchRoomShifts()
  }, [])

  // Real-time updates for room shifts
  useEffect(() => {
    if (socket) {
      socket.on('room_shifted', () => {
        // Refresh room shifts data when a new shift happens
        const fetchRoomShifts = async () => {
          try {
            const response = await fetch(`${BACKEND_URL}/api/room-shifts?limit=100`)
            if (response.ok) {
              const data = await response.json()
              if (data.success) {
                setShiftEvents(data.data)
              }
            }
          } catch (error) {
            console.error('Failed to fetch room shifts:', error)
          }
        }
        fetchRoomShifts()
      })
    }
  }, [socket])

  // Filtered and searched shift events (search by guest, room, authorizedBy, and date)
  const filteredShiftEvents = shiftEvents
    .filter(ev => {
      if (shiftDate) return ev.date === shiftDate
      return true
    })
    .filter(ev => {
      if (!shiftSearch.trim()) return true
      const q = shiftSearch.toLowerCase()
      return (
        ev.guest.toLowerCase().includes(q) ||
        ev.fromRoom.toLowerCase().includes(q) ||
        ev.toRoom.toLowerCase().includes(q) ||
        ev.authorizedBy.toLowerCase().includes(q) ||
        ev.reason.toLowerCase().includes(q)
      )
    })

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div className="flex justify-center gap-4 mb-2">
        {[
          { key: 'all', label: 'All', icon: <Bed className="h-6 w-6" /> },
          { key: 'couple', label: 'Couple', icon: <Heart className="h-6 w-6 text-pink-500" /> },
          { key: 'corporate', label: 'Corporate', icon: <Briefcase className="h-6 w-6 text-blue-600" /> },
          { key: 'solo', label: 'Solo', icon: <User className="h-6 w-6 text-gray-600" /> },
          { key: 'family', label: 'Family', icon: <Users className="h-6 w-6 text-yellow-600" /> },
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(cat.key as typeof categoryFilter)}
            className={`flex flex-col items-center px-4 py-2 rounded-xl border transition-all duration-150 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
              ${categoryFilter === cat.key ? 'bg-primary-100 border-primary-500 text-primary-700 font-bold scale-105' : 'bg-white border-gray-200 text-gray-500'}`}
            title={`Show ${cat.label} rooms`}
          >
            {cat.icon}
            <span className="mt-1 text-xs font-medium">{cat.label}</span>
          </button>
        ))}
      </div>
      {/* Heading */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-600">Manage room status, availability, and maintenance</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center"
            title="Refresh rooms data"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowShiftedRoomsModal(true)}
            className="btn-secondary flex items-center"
            title="Show all shifted room events"
          >
            <Clock className="h-4 w-4 mr-2" />
            Shifted Rooms
          </button>
          {hasPermission('rooms:create') && (
            <button 
              onClick={() => setShowAddRoom(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search rooms by number or guest name..."
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
              title="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
              <option value="cleaning">Cleaning</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field"
              title="Filter by type"
            >
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="deluxe">Deluxe</option>
              <option value="suite">Suite</option>
              <option value="presidential">Presidential</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="input-field"
              title="Filter by category"
            >
              <option value="all">All Categories</option>
              <option value="couple">Couple</option>
              <option value="corporate">Corporate</option>
              <option value="solo">Solo</option>
              <option value="family">Family</option>
            </select>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading rooms...</p>
            </div>
          </div>
        ) : error ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-2">Failed to load rooms</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleManualRefresh}
                className="btn-primary"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Retrying...' : 'Try Again'}
              </button>
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-2">No rooms found</p>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div key={room.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Room {room.number}</h3>
                  <p className="text-sm text-gray-500">Floor {room.floor}</p>
                  {room.status === 'occupied' && (
                    <div className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(room.category)}`}>
                      {getCategoryIcon(room.category)}
                      <span className="ml-1 capitalize">{room.category} Room</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(room.status)}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(room.status)}`}>
                    {room.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(room.type)}`}>
                    {room.type}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Price:</span>
                  <span className="text-sm font-medium text-gray-900">₹{room.price}/night</span>
                </div>

                {room.currentGuest && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Guest:</span>
                    <span className="text-sm font-medium text-gray-900">{room.currentGuest}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {room.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center text-xs text-gray-500">
                      {getAmenityIcon(amenity)}
                      <span className="ml-1 capitalize">{amenity}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setSelectedRoom(room)}
                      className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      title="View room details"
                    >
                      View Details
                    </button>
                    <div className="flex items-center space-x-1">
                      {room.status === 'occupied' && hasPermission('rooms:edit') && (
                        <>
                          <button 
                            onClick={() => handleCheckoutRoom(room)}
                            className="text-green-600 hover:text-green-900"
                            title="Check out guest"
                          >
                            Check Out
                          </button>
                          <button 
                            onClick={() => handleRoomShift(room)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Shift guest to another room"
                          >
                            Shift Room
                          </button>
                        </>
                      )}
                      {hasPermission('rooms:edit') && (
                        <button 
                          onClick={() => handleEditRoom(room)}
                          className={`${room.status === 'occupied' ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900'}`}
                          title={room.status === 'occupied' ? 'Cannot edit occupied room. Check out guest first.' : 'Edit room'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedRoom(room)}
                        className="text-gray-400 hover:text-gray-600"
                        title="More options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setSelectedRoom(null)}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Room {selectedRoom.number} Details</h3>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close details"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Room Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRoom.number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Floor</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRoom.floor}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(selectedRoom.type)}`}>
                      {selectedRoom.type}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <p className="mt-1 text-sm text-gray-900">₹{selectedRoom.price}/night</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1 flex items-center">
                    {getStatusIcon(selectedRoom.status)}
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRoom.status)}`}>
                      {selectedRoom.status}
                    </span>
                  </div>
                </div>

                {selectedRoom.currentGuest && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Guest</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRoom.currentGuest}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Check-in</label>
                        <p className="text-xs text-gray-900">{selectedRoom.checkInDate}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Check-out</label>
                        <p className="text-xs text-gray-900">{selectedRoom.checkOutDate}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amenities</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedRoom.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center text-xs text-gray-600">
                        {getAmenityIcon(amenity)}
                        <span className="ml-1 capitalize">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Cleaned</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRoom.lastCleaned}</p>
                </div>

                {selectedRoom.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRoom.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditRoom(selectedRoom)}
                      className={`btn-primary flex-1 ${selectedRoom.status === 'occupied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={selectedRoom.status === 'occupied'}
                    >
                      Edit Room
                    </button>
                    <button 
                      onClick={() => handleStatusChangeClick(selectedRoom)}
                      className={`btn-secondary flex-1 ${selectedRoom.status === 'occupied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={selectedRoom.status === 'occupied'}
                    >
                      Change Status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowAddRoom(false)}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Room</h3>
                <button
                  onClick={() => setShowAddRoom(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close add room"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRoom.number}
                    onChange={(e) => setNewRoom({...newRoom, number: e.target.value})}
                    className="input-field mt-1"
                    placeholder="e.g., 101, 205"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Room Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRoom.type}
                    onChange={(e) => setNewRoom({...newRoom, type: e.target.value as Room['type']})}
                    className="input-field mt-1"
                    required
                    title="Select room type"
                  >
                    <option value="standard">Standard</option>
                    <option value="deluxe">Deluxe</option>
                    <option value="suite">Suite</option>
                    <option value="presidential">Presidential</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Floor</label>
                    <input
                      type="number"
                      value={newRoom.floor || ''}
                      onChange={(e) => setNewRoom({...newRoom, floor: e.target.value ? parseInt(e.target.value) : 1})}
                      className="input-field mt-1"
                      min="1"
                      title="Enter floor number"
                      placeholder="Floor number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                    <input
                      type="number"
                      value={newRoom.price === 0 ? '' : newRoom.price}
                      onChange={(e) => setNewRoom({...newRoom, price: e.target.value ? parseInt(e.target.value) : 0})}
                      className="input-field mt-1"
                      min="0"
                      title="Enter price"
                      placeholder="Enter price"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={newRoom.status}
                    onChange={(e) => setNewRoom({...newRoom, status: e.target.value as Room['status']})}
                    className="input-field mt-1"
                    title="Select room status"
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amenities</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {availableAmenities.map((amenity) => (
                      <label key={amenity.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newRoom.amenities.includes(amenity.id)}
                          onChange={() => handleAmenityToggle(amenity.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{amenity.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={newRoom.notes}
                    onChange={(e) => setNewRoom({...newRoom, notes: e.target.value})}
                    className="input-field mt-1"
                    rows={3}
                    placeholder="Any special notes about the room"
                  />
                </div>

                <hr className="my-2 border-gray-200" />
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    Room Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRoom.category || 'couple'}
                    onChange={e => setNewRoom({ ...newRoom, category: e.target.value as Room['category'] })}
                    className="input-field mt-1 border-2 border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-500 transition-all"
                    required
                    title="Select room category"
                  >
                    <option value="couple">Couple</option>
                    <option value="corporate">Corporate</option>
                    <option value="solo">Solo</option>
                    <option value="family">Family</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddRoom}
                      className="btn-primary flex-1"
                    >
                      Add Room
                    </button>
                    <button
                      onClick={() => setShowAddRoom(false)}
                      className="btn-secondary flex-1"
                      title="Close add room"
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

      {/* Edit Room Modal */}
      {showEditRoom && editingRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowEditRoom(false)}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Room {editingRoom.number}</h3>
                <button
                  onClick={() => setShowEditRoom(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close edit room"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingRoom.number}
                    onChange={(e) => setEditingRoom({...editingRoom, number: e.target.value})}
                    className="input-field mt-1"
                    placeholder="e.g., 101, 205"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Room Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingRoom.type}
                    onChange={(e) => setEditingRoom({...editingRoom, type: e.target.value as Room['type']})}
                    className="input-field mt-1"
                    required
                    title="Select room type"
                  >
                    <option value="standard">Standard</option>
                    <option value="deluxe">Deluxe</option>
                    <option value="suite">Suite</option>
                    <option value="presidential">Presidential</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Floor</label>
                    <input
                      type="number"
                      value={editingRoom.floor}
                      onChange={(e) => setEditingRoom({...editingRoom, floor: parseInt(e.target.value) || 1})}
                      className="input-field mt-1"
                      min="1"
                      title="Enter floor number"
                      placeholder="Floor number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                    <input
                      type="number"
                      value={editingRoom.price}
                      onChange={(e) => setEditingRoom({...editingRoom, price: parseInt(e.target.value) || 0})}
                      className="input-field mt-1"
                      min="0"
                      title="Enter price"
                      placeholder="Room price"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editingRoom.status}
                    onChange={(e) => setEditingRoom({...editingRoom, status: e.target.value as Room['status']})}
                    className="input-field mt-1"
                    title="Select room status"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amenities</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {availableAmenities.map((amenity) => (
                      <label key={amenity.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingRoom.amenities.includes(amenity.id)}
                          onChange={() => handleEditAmenityToggle(amenity.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{amenity.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Cleaned</label>
                  <input
                    type="date"
                    value={editingRoom.lastCleaned}
                    onChange={(e) => setEditingRoom({...editingRoom, lastCleaned: e.target.value})}
                    className="input-field mt-1"
                    title="Select last cleaned date"
                    placeholder="Last cleaned date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={editingRoom.notes}
                    onChange={(e) => setEditingRoom({...editingRoom, notes: e.target.value})}
                    className="input-field mt-1"
                    rows={3}
                    placeholder="Any special notes about the room"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Room Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingRoom.category}
                    onChange={e => setEditingRoom({ ...editingRoom, category: e.target.value as Room['category'] })}
                    className="input-field mt-1"
                    required
                    title="Select room category"
                  >
                    <option value="couple">Couple</option>
                    <option value="corporate">Corporate</option>
                    <option value="solo">Solo</option>
                    <option value="family">Family</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleUpdateRoom}
                      className="btn-primary flex-1"
                    >
                      Update Room
                    </button>
                    <button
                      onClick={() => setShowEditRoom(false)}
                      className="btn-secondary flex-1"
                      title="Close edit room"
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

      {/* Room Shift Modal */}
      {showRoomShiftModal && shiftFromRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => { setShowRoomShiftModal(false); setShiftFromRoom(null) }}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Shift Guest from Room {shiftFromRoom.number}</h3>
                <button
                  onClick={() => {
                    setShowRoomShiftModal(false)
                    setShiftFromRoom(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close shift room"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Current Room Information</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Room:</strong> {shiftFromRoom.number}</p>
                    <p><strong>Guest:</strong> {shiftFromRoom.currentGuest}</p>
                    <p><strong>Check-in:</strong> {shiftFromRoom.checkInDate}</p>
                    <p><strong>Check-out:</strong> {shiftFromRoom.checkOutDate}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Destination Room Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={shiftDetails.toRoomNumber}
                    onChange={(e) => setShiftDetails({...shiftDetails, toRoomNumber: e.target.value})}
                    className="input-field mt-1"
                    required
                    title="Select destination room number"
                  >
                    <option value="">Select destination room</option>
                    {rooms
                      .filter(room => room.status === 'available' && room.number !== shiftFromRoom.number)
                      .map(room => (
                        <option key={room.id} value={room.number}>
                          Room {room.number} - {room.type} (₹{room.price}/night)
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Shift Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={shiftDetails.shiftDate}
                      onChange={(e) => setShiftDetails({...shiftDetails, shiftDate: e.target.value})}
                      className="input-field mt-1"
                      required
                      title="Select shift date"
                      placeholder="Shift date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Shift Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={shiftDetails.shiftTime}
                      onChange={(e) => setShiftDetails({...shiftDetails, shiftTime: e.target.value})}
                      className="input-field mt-1"
                      required
                      title="Select shift time"
                      placeholder="Shift time"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reason for Shift <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={shiftDetails.reason}
                    onChange={(e) => setShiftDetails({...shiftDetails, reason: e.target.value})}
                    className="input-field mt-1"
                    required
                    title="Select reason for shift"
                  >
                    <option value="">Select reason</option>
                    <option value="Maintenance Required">Maintenance Required</option>
                    <option value="Guest Request">Guest Request</option>
                    <option value="Room Upgrade">Room Upgrade</option>
                    <option value="Room Downgrade">Room Downgrade</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Management Decision">Management Decision</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Authorized By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shiftDetails.authorizedBy}
                    onChange={(e) => setShiftDetails({...shiftDetails, authorizedBy: e.target.value})}
                    className="input-field mt-1"
                    placeholder="Enter name of front desk manager"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                  <textarea
                    value={shiftDetails.notes}
                    onChange={(e) => setShiftDetails({...shiftDetails, notes: e.target.value})}
                    className="input-field mt-1"
                    rows={3}
                    placeholder="Any additional details about the room shift..."
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleRoomShiftSubmit}
                      className="btn-primary flex-1"
                    >
                      Complete Shift
                    </button>
                    <button
                      onClick={() => {
                        setShowRoomShiftModal(false)
                        setShiftFromRoom(null)
                      }}
                      className="btn-secondary flex-1"
                      title="Close shift room"
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
      {showCheckoutModal && checkoutRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => { setShowCheckoutModal(false); setCheckoutRoom(null) }}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Check Out Room {checkoutRoom.number}</h3>
                <button
                  onClick={() => {
                    setShowCheckoutModal(false)
                    setCheckoutRoom(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close checkout"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Room Information</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Room:</strong> {checkoutRoom.number}</p>
                    <p><strong>Type:</strong> {checkoutRoom.type}</p>
                    <p><strong>Guest:</strong> {checkoutRoom.currentGuest}</p>
                    <p><strong>Check-in:</strong> {checkoutRoom.checkInDate}</p>
                    <p><strong>Base Price:</strong> ₹{checkoutRoom.price}/night</p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Status</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span>₹{checkoutDetails.guestTotalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid Amount:</span>
                      <span>₹{checkoutDetails.guestPaidAmount}</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between font-medium">
                      <span>Balance:</span>
                      <span className={checkoutDetails.guestBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                        ₹{checkoutDetails.guestBalance}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Bill Breakdown</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Room Rent (including extra bed):</span>
                      <span>₹{checkoutDetails.finalAmount - (checkoutDetails.additionalCharges || 0) - (checkoutDetails.laundryCharges || 0) - (checkoutDetails.halfDayCharges || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fooding Charges:</span>
                      <span>₹{checkoutDetails.additionalCharges || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laundry Charges:</span>
                      <span>₹{checkoutDetails.laundryCharges || 0}</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between font-medium">
                      <span>Final Amount:</span>
                      <span>₹{checkoutDetails.finalAmount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-out Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={checkoutDetails.actualCheckOutDate}
                    onChange={(e) => setCheckoutDetails({...checkoutDetails, actualCheckOutDate: e.target.value})}
                    className="input-field mt-1"
                    min={checkoutRoom.checkInDate}
                    required
                    title="Select checkout date"
                    placeholder="Checkout date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fooding Charges (₹)</label>
                  <input
                    type="number"
                    value={checkoutDetails.additionalCharges || ''}
                    onChange={(e) => {
                      const additional = e.target.value ? parseInt(e.target.value) : 0
                      // Calculate base amount from guest's total amount (room rent + extra bed charges)
                      const baseAmount = checkoutDetails.finalAmount - (checkoutDetails.additionalCharges || 0) - (checkoutDetails.laundryCharges || 0)
                      setCheckoutDetails({
                        ...checkoutDetails, 
                        additionalCharges: additional,
                        finalAmount: baseAmount + additional + checkoutDetails.laundryCharges
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
                      // Calculate base amount from guest's total amount (room rent + extra bed charges)
                      const baseAmount = checkoutDetails.finalAmount - (checkoutDetails.additionalCharges || 0) - (checkoutDetails.laundryCharges || 0)
                      setCheckoutDetails({
                        ...checkoutDetails, 
                        laundryCharges: laundry,
                        finalAmount: baseAmount + checkoutDetails.additionalCharges + laundry + (checkoutDetails.halfDayCharges || 0)
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
                      const baseAmount = checkoutDetails.finalAmount - (checkoutDetails.additionalCharges || 0) - (checkoutDetails.laundryCharges || 0) - (checkoutDetails.halfDayCharges || 0)
                      setCheckoutDetails({
                        ...checkoutDetails,
                        halfDayCharges: half,
                        finalAmount: baseAmount + (checkoutDetails.additionalCharges || 0) + (checkoutDetails.laundryCharges || 0) + half
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
                      onClick={async () => {
                        // Quick preview: clone generateBill without bill number and edit button
                        // Reuse Guests preview approach by calling a small inline helper
                        await (async function previewBill() {
                          if (!checkoutRoom) return
                          try {
                            // Fetch guest
                            const response = await fetch(`${BACKEND_URL}/api/guests`)
                            const guestsData = await response.json()
                            if (!guestsData.success) throw new Error('Failed to fetch guests')
                            const guest = guestsData.data.find((g: any) => g.roomNumber === checkoutRoom.number && g.status === 'checked-in')
                            if (!guest) { showNotification('error', 'No active guest found for this room'); return }

                            // Build all same math as generateBill
                            const now = new Date()
                            const billTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            const checkInTime = new Date(guest.createdAt || guest.updatedAt || Date.now())
                            const formattedCheckInTime = checkInTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            const checkInParts = guest.checkInDate.split('-')
                            const checkInDate = new Date(parseInt(checkInParts[0]), parseInt(checkInParts[1]) - 1, parseInt(checkInParts[2]))
                            const outParts = checkoutDetails.actualCheckOutDate.split('-')
                            const checkOutDate = new Date(parseInt(outParts[2]), parseInt(outParts[1]) - 1, parseInt(outParts[0]))
                            let daysDiff = 1
                            if (checkOutDate.getTime() !== checkInDate.getTime()) {
                              const timeDiff = checkOutDate.getTime() - checkInDate.getTime()
                              daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
                            }

                            const roomsResponse = await fetch(`${BACKEND_URL}/api/rooms`)
                            const roomsData = await roomsResponse.json()
                            const room = roomsData.data.find((r: any) => r.number === guest.roomNumber)
                            const roomBasePricePerDay: number = room && typeof room.price === 'number' ? room.price : 0
                            const perDayFromCheckout = Math.max(0,(checkoutDetails.finalAmount || 0)-(checkoutDetails.additionalCharges || 0)-(checkoutDetails.laundryCharges || 0)-(checkoutDetails.halfDayCharges || 0))
                            let pricePerDay = 0; let extraBedCharges = 0
                            if (perDayFromCheckout > 0) { pricePerDay = perDayFromCheckout; extraBedCharges = 0 } else {
                              const fallbackExtra = guest.extraBeds ? guest.extraBeds.reduce((s: number, b: any) => s + b.charge, 0) : 0
                              const derivedPerDay = Math.round(Math.max(0, (guest.totalAmount - fallbackExtra)) / Math.max(1, daysDiff))
                              pricePerDay = roomBasePricePerDay > 0 ? roomBasePricePerDay : derivedPerDay
                              extraBedCharges = fallbackExtra
                            }
                            const roomRent = pricePerDay * daysDiff
                            const roomRentTaxableValue = roomRent / 1.12
                            const roomRentCgst = roomRentTaxableValue * 0.06
                            const roomRentSgst = roomRentTaxableValue * 0.06
                            const extraBedTaxableValue = extraBedCharges / 1.12
                            const extraBedCgst = extraBedTaxableValue * 0.06
                            const extraBedSgst = extraBedTaxableValue * 0.06
                            const addl = Number(checkoutDetails.additionalCharges) || 0
                            const laundry = Number(checkoutDetails.laundryCharges) || 0
                            const halfDay = Number(checkoutDetails.halfDayCharges) || 0
                            const foodingTaxableValue = addl > 0 ? addl / 1.05 : 0
                            const foodingCgst = foodingTaxableValue * 0.025
                            const foodingSgst = foodingTaxableValue * 0.025
                            const laundryTaxableValue = laundry > 0 ? laundry / 1.05 : 0
                            const laundryCgst = laundryTaxableValue * 0.025
                            const laundrySgst = laundryTaxableValue * 0.025
                            const halfDayTaxableValue = halfDay > 0 ? halfDay / 1.12 : 0
                            const halfDayCgst = halfDayTaxableValue * 0.06
                            const halfDaySgst = halfDayTaxableValue * 0.06
                            const taxableValue = roomRentTaxableValue + extraBedTaxableValue + foodingTaxableValue + laundryTaxableValue + halfDayTaxableValue
                            const cgst = roomRentCgst + extraBedCgst + foodingCgst + laundryCgst + halfDayCgst
                            const sgst = roomRentSgst + extraBedSgst + foodingSgst + laundrySgst + halfDaySgst
                            const totalAmount = (Number(roomRent) || 0) + (Number(extraBedCharges) || 0) + addl + laundry + halfDay
                            const totalAmountDisplay = Math.round(totalAmount)
                            
                            const amountInWords = numberToIndianWords(totalAmountDisplay || 0)
                            const arrivalDateParts = guest.checkInDate.split('-')
                            const formattedArrivalDate = `${arrivalDateParts[2]}-${arrivalDateParts[1]}-${arrivalDateParts[0]}`
                            const logoUrl = `${window.location.origin}/logo.png`
                            const billHTML = `<!DOCTYPE html><html><head><title></title><style>@media print{@page{size:A4;margin:5mm}html,body{margin:0;padding:0}.no-print{display:none!important}.charges-table,.signature-row{page-break-inside:avoid}.invoice-container{height:287mm;padding:4mm;box-sizing:border-box;display:flex;flex-direction:column}.content{flex:1 1 auto}.signature-row{margin-top:auto;margin-bottom:3mm}}body{font-family:Arial,sans-serif;margin:0;padding:0;font-size:12px;line-height:1.3}.header{text-align:center;margin-bottom:10px}.hotel-name{font-size:28px;font-weight:bold;margin-bottom:4px}.hotel-details{font-size:11px;color:#444;line-height:1.5}.logo-row{display:flex;justify-content:center;margin-bottom:8px}.logo{max-height:70px;width:auto}.guest-info{display:flex;justify-content:space-between;margin-bottom:12px}.guest-details,.stay-details{width:48%}.section-title{font-weight:bold;margin-bottom:8px;font-size:16px}.info-row{margin-bottom:6px;font-size:13.5px}.charges-table{width:100%;border-collapse:collapse;margin:10px 0;table-layout:fixed}.charges-table th,.charges-table td{border:1px solid #ddd;padding:6px;text-align:left;font-size:12px;word-wrap:break-word}.charges-table th{background-color:#f5f5f5;font-weight:bold}.total-row{font-weight:bold;background-color:#f9f9f9}.bank-details{margin-top:14px}.footer{margin-top:12px;text-align:center;font-size:10px}.print-btn{position:fixed;top:20px;right:20px;padding:10px 20px;color:#fff;border:none;border-radius:5px;cursor:pointer;background:#007bff}.print-btn:hover{background:#0056b3}.editable{border:1px dashed #ccc;padding:2px;min-height:1em}</style></head><body><button class="print-btn no-print" onclick="window.print()">Print Preview</button><div class="invoice-container"><div class="header"><div class="logo-row"><img src="${logoUrl}" alt="Logo" class="logo" /></div><div class="hotel-name">Hotel Diplomat Residency</div><div class="hotel-details">(A Unit of Aronax Enterprises Private Limited)<br>GST No: 09AANCA1929Q1ZY | CIN: U521000L2015PTC274988<br>63 Prakash Tower, Choupla Road Civil Lines, Bareilly - 243001 (Uttar Pradesh) INDIA<br>Mail: diplomatresidency.bly@gmail.com<br>Ph No: +91-9219414284</div></div><div class="guest-info content"><div class="guest-details"><div class="section-title">Billing To:</div><div class="info-row editable" contenteditable="false">Name: ${guest.name}</div><div class="info-row editable" contenteditable="false">Company: </div><div class="info-row editable" contenteditable="false">Designation: </div><div class="info-row editable" contenteditable="false">Address: ${guest.address || 'BAREILLY'}</div><div class="info-row editable" contenteditable="false">Phone No: ${guest.phone}</div><div class="info-row editable" contenteditable="false">Email ID: ${guest.email || ''}</div><div class="info-row editable" contenteditable="false">GST NO: </div></div><div class="stay-details"><div class="section-title">Stay Details:</div><div class="info-row editable" contenteditable="false">Date of Arrival: ${formattedArrivalDate}</div><div class="info-row editable" contenteditable="false">Date of Departure: ${checkoutDetails.actualCheckOutDate}</div><div class="info-row editable" contenteditable="false">ROOM NO: ${guest.roomNumber}</div><div class="info-row editable" contenteditable="false">PAX: ${1 + (guest.secondaryGuest ? 1 : 0) + (guest.extraBeds ? guest.extraBeds.length : 0)}</div><div class="info-row editable" contenteditable="false">Plan: ${guest.plan || 'EP'}</div><div class="info-row editable" contenteditable="false">Check In Time: ${formattedCheckInTime}</div><div class="info-row editable" contenteditable="false">Check Out Time: ${billTime}</div></div></div><table class="charges-table"><thead><tr><th>Room No.</th><th>Name</th><th>No. of Days</th><th>Price/Day</th><th>Taxable Value</th><th>Tax Rate</th><th>CGST</th><th>SGST</th><th>Total Value</th></tr></thead><tbody><tr><td class="editable" contenteditable="false">${guest.roomNumber}</td><td class="editable" contenteditable="false">${guest.name}</td><td class="editable" contenteditable="false">${daysDiff}</td><td class="editable" contenteditable="false">₹${pricePerDay}</td><td class="editable" contenteditable="false">₹${roomRentTaxableValue.toFixed(2)}</td><td>12%</td><td class="editable" contenteditable="false">₹${roomRentCgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${roomRentSgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${roomRent}</td></tr>${extraBedCharges > 0 ? `<tr><td colspan="4" class="editable" contenteditable="false">Extra Bed Charges</td><td class="editable" contenteditable="false">₹${extraBedTaxableValue.toFixed(2)}</td><td>12%</td><td class="editable" contenteditable="false">₹${extraBedCgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${extraBedSgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${extraBedCharges}</td></tr>` : ''}${addl > 0 ? `<tr><td colspan="4" class="editable" contenteditable="false">Fooding Charges</td><td class="editable" contenteditable="false">₹${foodingTaxableValue.toFixed(2)}</td><td>5%</td><td class="editable" contenteditable="false">₹${foodingCgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${foodingSgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${addl}</td></tr>` : ''}${laundry > 0 ? `<tr><td colspan="4" class="editable" contenteditable="false">Laundry Charges</td><td class="editable" contenteditable="false">₹${laundryTaxableValue.toFixed(2)}</td><td>5%</td><td class="editable" contenteditable="false">₹${laundryCgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${laundrySgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${laundry}</td></tr>` : ''}${halfDay > 0 ? `<tr><td colspan="4" class="editable" contenteditable="false">Late Checkout Charges</td><td class="editable" contenteditable="false">₹${halfDayTaxableValue.toFixed(2)}</td><td>12%</td><td class="editable" contenteditable="false">₹${halfDayCgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${halfDaySgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${halfDay}</td></tr>` : ''}<tr class="total-row"><td colspan="4">TOTAL</td><td class="editable" contenteditable="false">₹${taxableValue.toFixed(2)}</td><td></td><td class="editable" contenteditable="false">₹${cgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${sgst.toFixed(2)}</td><td class="editable" contenteditable="false">₹${totalAmountDisplay}</td></tr></tbody></table><div style="text-align:right;font-size:11px;margin-top:4px;"><span>Round Off:</span> <span class="editable" contenteditable="false">₹${(totalAmountDisplay - totalAmount).toFixed(2)}</span></div><div style="margin:10px 0;"><strong>IN WORD:</strong> <span class="editable" contenteditable="false">${amountInWords} ONLY.</span></div><div style="margin:10px 0;"><strong>STAX NO:</strong> AANCA1929QSD001 | <strong>PAN NO:</strong> AANCA1929Q</div><div class="bank-details"><div class="section-title">Bank Account Detail:</div><div class="info-row">Account Holder: Aronax Enterprises Private Limited</div><div class="info-row">Bank Name: HDFC Bank Limited</div><div class="info-row">Account No: 50200011166109</div><div class="info-row">IFSC Code: HDFC0000304</div></div><div class="signature-row"><div class="signature-box"><div class="signature-line">Authorised Signatory</div></div><div class="signature-box"><div class="signature-line">Guest Signature</div></div></div><div class="footer"><div style="margin-bottom:6px;">*Please Deposit your Key to the Receptionists*</div><div>THANK YOU FOR YOUR VISIT, PLEASE VISIT AGAIN !!!!</div></div></div></body></html>`
                            const billWindow = window.open('', '_blank', 'width=800,height=600')
                            if (billWindow) { billWindow.document.write(billHTML); billWindow.document.close() }
                          } catch (e) { console.error('Preview bill error:', e); showNotification('error', 'Failed to preview bill') }
                        })()
                      }}
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
                        setCheckoutRoom(null)
                      }}
                      className="btn-secondary flex-1"
                      title="Close checkout"
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

      {/* Status Change Modal */}
      {showStatusChangeModal && statusChangeRoom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => { setShowStatusChangeModal(false); setStatusChangeRoom(null) }}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Change Status - Room {statusChangeRoom.number}</h3>
                <button
                  onClick={() => {
                    setShowStatusChangeModal(false)
                    setStatusChangeRoom(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close status change"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
                  <div className="flex items-center">
                    {getStatusIcon(statusChangeRoom.status)}
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(statusChangeRoom.status)}`}>
                      {statusChangeRoom.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as Room['status'])}
                    className="input-field mt-1"
                    required
                    title="Select new status"
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                    <option value="cleaning">Cleaning</option>
                    {statusChangeRoom.currentGuest && (
                      <option value="occupied">Occupied</option>
                    )}
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleStatusChangeSubmit}
                      className="btn-primary flex-1"
                    >
                      Update Status
                    </button>
                    <button
                      onClick={() => {
                        setShowStatusChangeModal(false)
                        setStatusChangeRoom(null)
                      }}
                      className="btn-secondary flex-1"
                      title="Close status change"
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
      
      {/* Checkout Reminder Modal */}
      {showCheckoutReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-pulse" onClick={() => setShowCheckoutReminder(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-4 border-yellow-400 animate-blink" onClick={e => e.stopPropagation()}>
            <div className="flex items-center mb-4">
              <Clock className="h-8 w-8 text-yellow-500 animate-pulse" />
              <h2 className="ml-3 text-2xl font-bold text-yellow-700">Checkout Reminder</h2>
            </div>
            <p className="text-gray-700 mb-4 font-medium">It&apos;s 11:00 AM! Please check and confirm the following rooms need to be checked out:</p>
            <ul className="mb-4 max-h-40 overflow-y-auto">
              {checkoutReminderRooms.map(room => (
                <li key={room.id} className="py-1 px-2 rounded bg-yellow-50 mb-1 border border-yellow-200 flex items-center">
                  <Bed className="h-4 w-4 text-yellow-500 mr-2" />
                  <span className="font-semibold text-yellow-800">Room {room.number}</span>
                  <span className="ml-2 text-gray-500 text-xs">({room.currentGuest || 'Occupied'})</span>
                </li>
              ))}
            </ul>
            <button
              className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg shadow transition-colors text-lg"
              onClick={() => setShowCheckoutReminder(false)}
            >
              Confirm All Rooms Checked Out
            </button>
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
              <button className="btn-primary" onClick={() => { setShowConfirmCheckout(false); handleCheckoutSubmit(); }}>Yes, Check Out</button>
            </div>
          </div>
        </div>
      )}
      {/* Shifted Rooms Modal */}
      {showShiftedRoomsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center" onClick={() => setShowShiftedRoomsModal(false)}>
          <div className="relative mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Shifted Rooms</h2>
              <button
                onClick={() => setShowShiftedRoomsModal(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <input
                type="text"
                value={shiftSearch}
                onChange={e => setShiftSearch(e.target.value)}
                className="input-field w-48"
                placeholder="Search by guest, room, reason..."
                title="Search shifted rooms"
              />
              <input
                type="date"
                className="input-field"
                value={shiftDate}
                onChange={e => setShiftDate(e.target.value)}
                title="Filter by date"
              />
              {shiftDate && (
                <button
                  className="btn-secondary ml-1"
                  onClick={() => setShiftDate('')}
                  title="Clear date filter"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">From Room</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">To Room</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Authorized By</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredShiftEvents.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-4">No shifted rooms found.</td></tr>
                  ) : filteredShiftEvents.map((ev, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 whitespace-nowrap">{ev.date}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{ev.time}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{ev.guest}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{ev.fromRoom}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{ev.toRoom}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{ev.reason}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{ev.authorizedBy}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{ev.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Rooms 