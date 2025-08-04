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
  const [checkoutDetails, setCheckoutDetails] = useState({
    guestName: '',
    actualCheckOutDate: '',
    finalAmount: 0,
    additionalCharges: 0,
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
      const response = await fetch('http://localhost:3001/api/rooms')
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
        const response = await fetch('http://localhost:3001/api/rooms')
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
        // Fallback to mock data if API fails
        setRooms([
      {
        id: '1',
        number: '101',
        type: 'standard',
        status: 'occupied',
        floor: 1,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        currentGuest: 'Rahul Sharma',
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-18',
        lastCleaned: '2024-01-15',
        notes: 'Guest requested extra towels',
        category: 'couple'
      },
      {
        id: '2',
        number: '102',
        type: 'standard',
        status: 'available',
        floor: 1,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'solo'
      },
      {
        id: '3',
        number: '103',
        type: 'standard',
        status: 'available',
        floor: 1,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'corporate'
      },
      {
        id: '4',
        number: '104',
        type: 'standard',
        status: 'maintenance',
        floor: 1,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-10',
        notes: 'AC repair needed',
        category: 'family'
      },
      {
        id: '5',
        number: '202',
        type: 'suite',
        status: 'reserved',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        lastCleaned: '2024-01-15',
        notes: 'Reserved for MD of hotel',
        category: 'couple'
      },
      {
        id: '6',
        number: '204',
        type: 'deluxe',
        status: 'available',
        floor: 2,
        price: 2500,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'solo'
      },
      {
        id: '7',
        number: '208',
        type: 'deluxe',
        status: 'occupied',
        floor: 2,
        price: 2500,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony'],
        currentGuest: 'Priya Patel',
        checkInDate: '2024-01-14',
        checkOutDate: '2024-01-17',
        lastCleaned: '2024-01-14',
        notes: '',
        category: 'corporate'
      },
      {
        id: '8',
        number: '210',
        type: 'deluxe',
        status: 'available',
        floor: 2,
        price: 2500,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'family'
      },
      {
        id: '9',
        number: '212',
        type: 'deluxe',
        status: 'cleaning',
        floor: 2,
        price: 2500,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony'],
        lastCleaned: '2024-01-16',
        notes: 'Currently being cleaned',
        category: 'couple'
      },
      {
        id: '10',
        number: '214',
        type: 'deluxe',
        status: 'available',
        floor: 2,
        price: 2500,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'solo'
      },
      {
        id: '11',
        number: '216',
        type: 'suite',
        status: 'reserved',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        lastCleaned: '2024-01-15',
        notes: '',
        category: 'corporate'
      },
      {
        id: '12',
        number: '211',
        type: 'presidential',
        status: 'reserved',
        floor: 2,
        price: 8000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi', 'butler'],
        lastCleaned: '2024-01-15',
        notes: 'Permanently reserved for MD of Hotel',
        category: 'family'
      },
      {
        id: '13a', // was '13', now unique
        number: '218',
        type: 'suite',
        status: 'available',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'couple'
      },
      {
        id: '14',
        number: '221',
        type: 'suite',
        status: 'occupied',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        currentGuest: 'Amit Kumar',
        checkInDate: '2024-01-20',
        checkOutDate: '2024-01-22',
        lastCleaned: '2024-01-20',
        notes: '',
        category: 'corporate'
      },
      {
        id: '15',
        number: '222',
        type: 'suite',
        status: 'available',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'family'
      },
      {
        id: '16',
        number: '223',
        type: 'suite',
        status: 'available',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'couple'
      },
      {
        id: '17',
        number: '224',
        type: 'suite',
        status: 'available',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'solo'
      },
      {
        id: '18',
        number: '225',
        type: 'suite',
        status: 'available',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'corporate'
      },
      {
        id: '19',
        number: '226',
        type: 'suite',
        status: 'available',
        floor: 2,
        price: 4000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'family'
      },
      {
        id: '20',
        number: '301',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'couple'
      },
      {
        id: '21',
        number: '302',
        type: 'standard',
        status: 'occupied',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        currentGuest: 'Neha Singh',
        checkInDate: '2024-01-12',
        checkOutDate: '2024-01-15',
        lastCleaned: '2024-01-12',
        notes: '',
        category: 'solo'
      },
      {
        id: '22',
        number: '303',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'corporate'
      },
      {
        id: '23',
        number: '304',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'family'
      },
      {
        id: '24',
        number: '305',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'couple'
      },
      {
        id: '25',
        number: '306',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'solo'
      },
      {
        id: '26',
        number: '307',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'corporate'
      },
      {
        id: '27',
        number: '308',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'family'
      },
      {
        id: '28',
        number: '309',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'couple'
      },
      {
        id: '29',
        number: '312',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'solo'
      },
      {
        id: '30',
        number: '314',
        type: 'standard',
        status: 'available',
        floor: 3,
        price: 1500,
        amenities: ['wifi', 'tv', 'ac'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'corporate'
      },
      {
        id: '31',
        number: '401',
        type: 'presidential',
        status: 'available',
        floor: 4,
        price: 8000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi', 'butler'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'couple'
      },
      {
        id: '32',
        number: '411',
        type: 'presidential',
        status: 'available',
        floor: 4,
        price: 8000,
        amenities: ['wifi', 'tv', 'ac', 'coffee', 'balcony', 'jacuzzi', 'butler'],
        lastCleaned: '2024-01-16',
        notes: '',
        category: 'family'
      }
        ])
        showNotification('error', `Failed to fetch rooms: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRooms()

    // Setup WebSocket connection for real-time updates
    const newSocket = io('http://localhost:3001')
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
      const response = await fetch(`http://localhost:3001/api/rooms/${roomId}`, {
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
      const response = await fetch('http://localhost:3001/api/rooms', {
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
      const response = await fetch(`http://localhost:3001/api/rooms/${editingRoom.id}`, {
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
      const response = await fetch(`http://localhost:3001/api/guests`)
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
      setCheckoutDetails({
        guestName: room.currentGuest || '',
        actualCheckOutDate: new Date().toISOString().split('T')[0],
        finalAmount: baseAmount, // Use guest's total amount as base
        additionalCharges: 0,
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
      const response = await fetch(`http://localhost:3001/api/guests`)
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
      const updateResponse = await fetch(`http://localhost:3001/api/guests/${guest.id}`, {
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
      // Call the API to shift the room
      const response = await fetch(`http://localhost:3001/api/rooms/${shiftFromRoom.id}/shift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shiftDetails)
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
      const refreshResponse = await fetch('http://localhost:3001/api/rooms')
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
      const response = await fetch(`http://localhost:3001/api/rooms/${statusChangeRoom.id}`, {
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
        const response = await fetch('http://localhost:3001/api/room-shifts?limit=100')
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
            const response = await fetch('http://localhost:3001/api/room-shifts?limit=100')
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
                      <span>₹{checkoutDetails.finalAmount - (checkoutDetails.additionalCharges || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fooding Charges:</span>
                      <span>₹{checkoutDetails.additionalCharges || 0}</span>
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
                      const baseAmount = checkoutDetails.finalAmount - (checkoutDetails.additionalCharges || 0)
                      setCheckoutDetails({
                        ...checkoutDetails, 
                        additionalCharges: additional,
                        finalAmount: baseAmount + additional
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