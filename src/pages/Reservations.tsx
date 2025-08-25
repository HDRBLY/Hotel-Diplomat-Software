import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  User, 
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2
} from 'lucide-react'
import Notification, { useNotification } from '../components/Notification'

interface Reservation {
  id: string
  guestName: string
  email: string
  phone: string
  roomNumber: string
  roomType: string
  checkInDate: string
  checkOutDate: string
  numberOfGuests: number
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked-in'
  totalAmount: number
  depositAmount: number
  specialRequests: string
  bookingDate: string
  paymentMethod: string
  category?: 'couple' | 'corporate' | 'solo' | 'family'
  address?: string
  idProof?: string
  idProofType?: string
  plan?: 'EP' | 'CP' | 'MAP' | 'AP'
  complimentary?: boolean
  secondaryGuest?: {
    name: string
    phone?: string
    idProof?: string
    idProofType?: string
  }
  extraBeds?: Array<{
    name: string
    phone?: string
    idProof?: string
    idProofType?: string
    charge: number
  }>
}

type NewReservationForm = {
  guestName: string
  email: string
  phone: string
  roomNumber: string
  roomType: string
  category?: 'couple' | 'corporate' | 'solo' | 'family'
  checkInDate: string
  checkOutDate: string
  numberOfGuests: number
  totalAmount: string
  depositAmount: string
  specialRequests: string
  paymentMethod: string
  secondaryGuest?: {
    name: string
    phone?: string
    idProof?: string
    idProofType?: string
  }
  extraBeds?: Array<{
    name: string
    phone?: string
    idProof?: string
    idProofType?: string
    charge: number
  }>
  address?: string
  idProof?: string
  idProofType?: string
  plan?: 'EP' | 'CP' | 'MAP' | 'AP'
  complimentary?: boolean
}

type RoomSummary = {
  id: string
  number: string
  type: string
  status: string
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const Reservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showAddReservation, setShowAddReservation] = useState(false)
  const [editReservation, setEditReservation] = useState<Reservation | null>(null)
  const { notification, showNotification, hideNotification } = useNotification()
  const [newReservation, setNewReservation] = useState<NewReservationForm>({
    guestName: '',
    email: '',
    phone: '',
    roomNumber: '',
    roomType: 'Standard',
    category: 'couple',
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    totalAmount: '',
    depositAmount: '',
    specialRequests: '',
    paymentMethod: 'UPI',
    secondaryGuest: undefined,
    extraBeds: [],
    address: '',
    idProof: '',
    idProofType: 'AADHAR',
    plan: 'EP',
    complimentary: false
  })

  const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([])
  const [showSecondaryGuest, setShowSecondaryGuest] = useState(false)

  // Available room types
  const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Presidential']
  const paymentMethods = ['UPI', 'Bank Transfer', 'Credit Card', 'Cash', 'Pending']

  // Load real reservations from backend
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/reservations`)
        if (!res.ok) throw new Error(`Failed to fetch reservations: ${res.status}`)
        const data = await res.json()
        if (data.success) {
          // Normalize status to lower-case to match UI expectations
          const normalized: Reservation[] = (data.data || []).map((r: any) => ({
            ...r,
            status: (r.status || 'pending').toString().toLowerCase()
          }))
          setReservations(normalized)
        } else {
          setReservations([])
        }
      } catch (e) {
        setReservations([])
      }
    }
    fetchReservations()
  }, [])

  // Load available rooms for selection (only AVAILABLE)
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms`)
        if (!res.ok) return
        const data = await res.json()
        const rooms: RoomSummary[] = (data.data || [])
          .filter((r: any) => (r.status || '').toLowerCase() === 'available')
          .map((r: any) => ({ id: String(r.id), number: String(r.number), type: String(r.type || ''), status: String(r.status || '') }))
          .sort((a: RoomSummary, b: RoomSummary) => a.number.localeCompare(b.number, undefined, { numeric: true }))
        setAvailableRooms(rooms)
      } catch {}
    }
    fetchRooms()
  }, [])

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = reservation.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.roomNumber.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'upcoming' && new Date(reservation.checkInDate) > new Date()) ||
                       (dateFilter === 'past' && new Date(reservation.checkOutDate) < new Date()) ||
                       (dateFilter === 'current' && new Date(reservation.checkInDate) <= new Date() && new Date(reservation.checkOutDate) >= new Date())
    return matchesSearch && matchesStatus && matchesDate
  }).sort((a, b) => {
    const aDate = a.bookingDate ? new Date(a.bookingDate).getTime() : new Date(a.checkInDate).getTime();
    const bDate = b.bookingDate ? new Date(b.bookingDate).getTime() : new Date(b.checkInDate).getTime();
    return bDate - aDate;
  }) // Sort by most recent first

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      case 'checked-in':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'checked-in':
        return <User className="h-4 w-4 text-blue-500" />
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />
    }
  }

  const handleStatusChange = async (reservationId: string, newStatus: Reservation['status']) => {
    // Optimistic UI
    setReservations(prev => prev.map(reservation => 
      reservation.id === reservationId 
        ? { ...reservation, status: newStatus }
        : reservation
    ))
    try {
      await fetch(`${BACKEND_URL}/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
    } catch {}
  }

  const handleDeleteReservation = async (reservationId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/reservations/${reservationId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete reservation')
      setReservations(prev => prev.filter(r => r.id !== reservationId))
    } catch (e) {
      // no-op; keep UI unchanged on failure
    }
  }

  const handleAddReservation = async () => {
    if (!newReservation.guestName || !newReservation.phone || !newReservation.roomNumber || 
        !newReservation.checkInDate || !newReservation.checkOutDate) {
      showNotification('error', 'Please fill all mandatory fields (Guest Name, Phone, Room Number, Check-in Date, Check-out Date)')
      return
    }

    // Allow same-day checkout; only block if checkout is before checkin
    if (new Date(newReservation.checkOutDate) < new Date(newReservation.checkInDate)) {
      showNotification('error', 'Check-out date must be after check-in date')
      return
    }

    // Persist to backend
    try {
      const res = await fetch(`${BACKEND_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: newReservation.guestName,
          email: newReservation.email,
          phone: newReservation.phone,
          roomNumber: newReservation.roomNumber,
          roomType: newReservation.roomType,
          category: newReservation.category || 'couple',
          checkInDate: newReservation.checkInDate,
          checkOutDate: newReservation.checkOutDate,
          numberOfGuests: newReservation.numberOfGuests,
          totalAmount: Number(newReservation.totalAmount) || 0,
          depositAmount: Number(newReservation.depositAmount) || 0,
          specialRequests: newReservation.specialRequests,
          paymentMethod: newReservation.paymentMethod,
          secondaryGuest: newReservation.secondaryGuest,
          extraBeds: (newReservation.extraBeds || []).map(b => ({
            ...b,
            charge: Number(b.charge) || 0
          })),
          address: newReservation.address || '',
          idProof: newReservation.idProof || '',
          idProofType: newReservation.idProofType || 'AADHAR',
          plan: newReservation.plan || 'EP',
          complimentary: !!newReservation.complimentary
        })
      })
      if (!res.ok) throw new Error('Failed to create reservation')
      const data = await res.json()
      if (data.success && data.data) {
        // Add newly created (normalize status)
        setReservations(prev => [{ ...data.data, status: (data.data.status || 'pending').toString().toLowerCase() }, ...prev])
      }
    } catch (e) {
      showNotification('error', 'Failed to create reservation. Please try again.')
      return
    }
    
    // Reset form
    setNewReservation({
      guestName: '',
      email: '',
      phone: '',
      roomNumber: '',
      roomType: 'Standard',
      category: 'couple',
      checkInDate: '',
      checkOutDate: '',
      numberOfGuests: 1,
      totalAmount: '',
      depositAmount: '',
      specialRequests: '',
      paymentMethod: 'UPI',
      secondaryGuest: undefined,
      extraBeds: [],
      address: '',
      idProof: '',
      idProofType: 'AADHAR',
      plan: 'EP',
      complimentary: false
    })
    
    setShowAddReservation(false)
    showNotification('success', 'Reservation added successfully!')
  }

  const computeExtraBedsTotal = (extraBeds?: Array<{ charge: number }>) =>
    (extraBeds || []).reduce((sum, bed) => sum + (Number(bed.charge) || 0), 0)

  const handleUpdateReservation = async () => {
    if (!editReservation) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/reservations/${editReservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editReservation)
      })
      if (!res.ok) throw new Error('Failed to update reservation')
      const data = await res.json()
      if (data.success) {
        setReservations(prev => prev.map(r => r.id === editReservation.id ? { ...editReservation } as any : r))
        setEditReservation(null)
        showNotification('success', 'Reservation updated successfully!')
      }
    } catch (e) {
      showNotification('error', 'Failed to update reservation. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservation Management</h1>
          <p className="text-gray-600">Manage bookings, confirmations, and guest reservations</p>
        </div>
        <button 
          onClick={() => setShowAddReservation(true)}
          className="btn-primary flex items-center"
          title="Add new reservation"
          aria-label="Add new reservation"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Reservation
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reservations by guest name, email, or room number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                aria-label="Search reservations"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              aria-label="Filter by status"
              title="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="checked-in">Checked In</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field"
              aria-label="Filter by date"
              title="Filter by date"
            >
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="current">Current</option>
              <option value="past">Past</option>
            </select>
            <button className="btn-secondary flex items-center" title="Apply filters" aria-label="Apply filters">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Guest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room & Dates
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
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {reservation.guestName}
                          {reservation.secondaryGuest?.name ? ` + ${reservation.secondaryGuest.name}` : ''}
                          {Array.isArray(reservation.extraBeds) && reservation.extraBeds.length > 0
                            ? reservation.extraBeds.map(b => b.name ? ` + ${b.name}` : '').join('')
                            : ''}
                        </div>
                        <div className="text-sm text-gray-500">{reservation.email}</div>
                        <div className="text-sm text-gray-500">{reservation.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">Room {reservation.roomNumber} ({reservation.roomType})</div>
                      <div className="text-gray-500">
                        <div>Check-in: {reservation.checkInDate}</div>
                        <div>Check-out: {reservation.checkOutDate}</div>
                        <div>{reservation.numberOfGuests} guest(s)</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(reservation.status)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(reservation.status)}`}>
                        {reservation.status.replace('-', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>Total: ₹{reservation.totalAmount}</div>
                      <div>Deposit: ₹{reservation.depositAmount}</div>
                      <div className="text-xs text-gray-500">{reservation.paymentMethod}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {reservation.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                          className="text-green-600 hover:text-green-900"
                          title="Confirm reservation"
                          aria-label="Confirm reservation"
                        >
                          Confirm
                        </button>
                      )}
                      {reservation.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(reservation.id, 'checked-in')}
                          className="text-blue-600 hover:text-blue-900"
                          title="Check in guest"
                          aria-label="Check in guest"
                        >
                          Check In
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedReservation(reservation)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View reservation details"
                        aria-label="View reservation details"
                      >
                        View
                      </button>
                      {reservation.status !== 'checked-in' && (
                        <button 
                          onClick={() => setEditReservation(reservation)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit reservation"
                          aria-label="Edit reservation"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteReservation(reservation.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete reservation"
                        aria-label="Delete reservation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reservation Details Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setSelectedReservation(null)}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Reservation Details</h3>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close details"
                  aria-label="Close reservation details"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Guest</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.guestName}</p>
                    <p className="text-xs text-gray-500">{selectedReservation.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guest Type</label>
                    <p className="mt-1 text-sm text-gray-900">{(selectedReservation.category || '').toString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.address || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Proof</label>
                    <p className="mt-1 text-sm text-gray-900">{`${selectedReservation.idProofType || ''}${selectedReservation.idProof ? '-' + selectedReservation.idProof : ''}` || '-'}</p>
                  </div>
                </div>
                {selectedReservation.secondaryGuest?.name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Secondary Guest</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.secondaryGuest.name}</p>
                  </div>
                )}
                {Array.isArray(selectedReservation.extraBeds) && selectedReservation.extraBeds.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Extra Beds ({selectedReservation.extraBeds.length})</label>
                    <div className="mt-2 space-y-2">
                      {selectedReservation.extraBeds.map((bed, i) => (
                        <div key={i} className="border rounded p-2">
                          <div className="text-sm text-gray-900 font-medium">Extra Bed {i + 1}</div>
                          <div className="text-sm text-gray-700">Name: {bed.name || '-'}</div>
                          <div className="text-sm text-gray-700">Charge: ₹{Number(bed.charge) || 0}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Room Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.roomNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Room Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.roomType}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.plan || 'EP'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Guests</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.numberOfGuests}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check-in Date</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.checkInDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check-out Date</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.checkOutDate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total</label>
                    <p className="mt-1 text-sm text-gray-900">₹{(Number(selectedReservation.totalAmount) || 0) + computeExtraBedsTotal(selectedReservation.extraBeds)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Paid</label>
                    <p className="mt-1 text-sm text-gray-900">₹{selectedReservation.depositAmount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Balance</label>
                    <p className="mt-1 text-sm text-gray-900">₹{Math.max(0, ((Number(selectedReservation.totalAmount) || 0) + computeExtraBedsTotal(selectedReservation.extraBeds)) - (Number(selectedReservation.depositAmount) || 0))}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedReservation.status)}`}>
                    {selectedReservation.status.replace('-', ' ')}
                  </span>
                </div>
                {selectedReservation.specialRequests && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Special Requests</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.specialRequests}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Reservation Modal */}
      {/* Edit Reservation Modal - only extra bed charges editable */}
      {editReservation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setEditReservation(null)}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Reservation</h3>
                <button
                  onClick={() => setEditReservation(null)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close edit reservation"
                  aria-label="Close edit reservation"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-gray-600">Paid Amount and Balance are not editable here.</div>

                {/* Show read-only primary details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Primary Guest</label>
                    <div className="mt-1 text-sm text-gray-900">{editReservation.guestName}</div>
                    <div className="text-xs text-gray-500">{editReservation.phone}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">ID Proof</label>
                    <div className="mt-1 text-sm text-gray-900">{`${editReservation.idProofType || ''}${editReservation.idProof ? '-' + editReservation.idProof : ''}` || '-'}</div>
                  </div>
                </div>

                {/* Editable extra bed charges only */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Extra Beds</label>
                  <div className="mt-2 space-y-2">
                    {(editReservation.extraBeds || []).map((bed, i) => (
                      <div key={i} className="grid grid-cols-4 gap-4 items-end">
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Name</label>
                          <input type="text" value={bed.name || ''} readOnly className="input-field mt-1" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">ID</label>
                          <input type="text" value={bed.idProof || ''} readOnly className="input-field mt-1" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">ID Type</label>
                          <input type="text" value={bed.idProofType || ''} readOnly className="input-field mt-1" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Charge (₹)</label>
                          <input
                            type="number"
                            value={Number(bed.charge) || 0}
                            onChange={(e) => {
                              const list = [...(editReservation.extraBeds || [])]
                              list[i] = { ...list[i], charge: Number(e.target.value) || 0 }
                              setEditReservation({ ...editReservation, extraBeds: list })
                            }}
                            className="input-field mt-1"
                            min={0}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button onClick={handleUpdateReservation} className="btn-primary flex-1">Save</button>
                  <button onClick={() => setEditReservation(null)} className="btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddReservation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowAddReservation(false)}>
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">New Reservation</h3>
                <button
                  onClick={() => setShowAddReservation(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close add reservation"
                  aria-label="Close add reservation form"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
                    Guest Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guestName"
                    type="text"
                    value={newReservation.guestName}
                    onChange={(e) => setNewReservation({...newReservation, guestName: e.target.value})}
                    className="input-field mt-1"
                    placeholder="Enter guest full name"
                    required
                    aria-label="Guest name"
                  />
                </div>

                <div>
                  <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="guestEmail"
                    type="email"
                    value={newReservation.email}
                    onChange={(e) => setNewReservation({...newReservation, email: e.target.value})}
                    className="input-field mt-1"
                    placeholder="Enter email address"
                    aria-label="Guest email"
                  />
                </div>

                <div>
                  <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guestPhone"
                    type="tel"
                    value={newReservation.phone}
                    onChange={(e) => setNewReservation({...newReservation, phone: e.target.value})}
                    className="input-field mt-1"
                    placeholder="+91 98765 43210"
                    required
                    aria-label="Guest phone number"
                  />
                </div>

                {/* Primary Guest ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Proof Type</label>
                    <input
                      type="text"
                      value={newReservation.idProofType || 'AADHAR'}
                      onChange={(e) => setNewReservation({ ...newReservation, idProofType: e.target.value })}
                      className="input-field mt-1"
                      placeholder="AADHAR / PASSPORT"
                      aria-label="Primary ID proof type"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Proof Number</label>
                    <input
                      type="text"
                      value={newReservation.idProof || ''}
                      onChange={(e) => setNewReservation({ ...newReservation, idProof: e.target.value })}
                      className="input-field mt-1"
                      placeholder="Enter ID number"
                      aria-label="Primary ID proof number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700">
                      Room Number <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="roomNumber"
                      value={newReservation.roomNumber}
                      onChange={(e) => setNewReservation({...newReservation, roomNumber: e.target.value})}
                      className="input-field mt-1"
                      required
                      aria-label="Room number"
                    >
                      <option value="">Select available room</option>
                      {availableRooms.map(r => (
                        <option key={r.id} value={r.number}>Room {r.number} ({r.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="roomType" className="block text-sm font-medium text-gray-700">Room Type</label>
                    <select
                      id="roomType"
                      value={newReservation.roomType}
                      onChange={(e) => setNewReservation({...newReservation, roomType: e.target.value})}
                      className="input-field mt-1"
                      aria-label="Room type"
                    >
                      {roomTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">Guest Type</label>
                  <select
                    id="category"
                    value={newReservation.category}
                    onChange={(e) => setNewReservation({ ...newReservation, category: e.target.value as any })}
                    className="input-field mt-1"
                    aria-label="Guest type"
                    title="Select guest category (solo, couple, family, corporate)"
                  >
                    <option value="couple">Couple</option>
                    <option value="corporate">Corporate</option>
                    <option value="solo">Solo</option>
                    <option value="family">Family</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkInDate" className="block text-sm font-medium text-gray-700">
                      Check-in Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="checkInDate"
                      type="date"
                      value={newReservation.checkInDate}
                      onChange={(e) => setNewReservation({...newReservation, checkInDate: e.target.value})}
                      className="input-field mt-1"
                      required
                      aria-label="Check-in date"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkOutDate" className="block text-sm font-medium text-gray-700">
                      Check-out Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="checkOutDate"
                      type="date"
                      value={newReservation.checkOutDate}
                      onChange={(e) => setNewReservation({...newReservation, checkOutDate: e.target.value})}
                      min={newReservation.checkInDate || undefined}
                      className="input-field mt-1"
                      required
                      aria-label="Check-out date"
                    />
                  </div>
                </div>

                {/* Secondary Guest */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Secondary Guest</label>
                    <button
                      type="button"
                      className="text-primary-600 text-sm"
                      onClick={() => setShowSecondaryGuest(!showSecondaryGuest)}
                      aria-label="Toggle secondary guest"
                    >
                      {showSecondaryGuest ? 'Remove' : 'Add'}
                    </button>
                  </div>
                  {showSecondaryGuest && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          value={newReservation.secondaryGuest?.name || ''}
                          onChange={(e) => setNewReservation({
                            ...newReservation,
                            secondaryGuest: { ...(newReservation.secondaryGuest || { name: '' }), name: e.target.value }
                          })}
                          className="input-field mt-1"
                          placeholder="Secondary guest name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                          type="tel"
                          value={newReservation.secondaryGuest?.phone || ''}
                          onChange={(e) => setNewReservation({
                            ...newReservation,
                            secondaryGuest: { ...(newReservation.secondaryGuest || { name: '' }), phone: e.target.value }
                          })}
                          className="input-field mt-1"
                          placeholder="Phone"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID Proof</label>
                        <input
                          type="text"
                          value={newReservation.secondaryGuest?.idProof || ''}
                          onChange={(e) => setNewReservation({
                            ...newReservation,
                            secondaryGuest: { ...(newReservation.secondaryGuest || { name: '' }), idProof: e.target.value }
                          })}
                          className="input-field mt-1"
                          placeholder="ID number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID Proof Type</label>
                        <input
                          type="text"
                          value={newReservation.secondaryGuest?.idProofType || ''}
                          onChange={(e) => setNewReservation({
                            ...newReservation,
                            secondaryGuest: { ...(newReservation.secondaryGuest || { name: '' }), idProofType: e.target.value }
                          })}
                          className="input-field mt-1"
                          placeholder="AADHAR / PASSPORT"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Extra Beds */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Extra Beds</label>
                    <button
                      type="button"
                      className="text-primary-600 text-sm"
                      onClick={() => setNewReservation({
                        ...newReservation,
                        extraBeds: [...(newReservation.extraBeds || []), { name: '', charge: 0 }]
                      })}
                      aria-label="Add extra bed"
                    >
                      Add Bed
                    </button>
                  </div>
                  {(newReservation.extraBeds || []).map((bed, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          value={bed.name}
                          onChange={(e) => {
                            const list = [...(newReservation.extraBeds || [])]
                            list[idx] = { ...list[idx], name: e.target.value }
                            setNewReservation({ ...newReservation, extraBeds: list })
                          }}
                          className="input-field mt-1"
                          placeholder="Guest name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Charge (₹)</label>
                        <input
                          type="number"
                          value={Number(bed.charge) || 0}
                          onChange={(e) => {
                            const list = [...(newReservation.extraBeds || [])]
                            list[idx] = { ...list[idx], charge: Number(e.target.value) || 0 }
                            setNewReservation({ ...newReservation, extraBeds: list })
                          }}
                          className="input-field mt-1"
                          min="0"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID Proof</label>
                        <input
                          type="text"
                          value={bed.idProof || ''}
                          onChange={(e) => {
                            const list = [...(newReservation.extraBeds || [])]
                            list[idx] = { ...list[idx], idProof: e.target.value }
                            setNewReservation({ ...newReservation, extraBeds: list })
                          }}
                          className="input-field mt-1"
                          placeholder="ID number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID Proof Type</label>
                        <input
                          type="text"
                          value={bed.idProofType || ''}
                          onChange={(e) => {
                            const list = [...(newReservation.extraBeds || [])]
                            list[idx] = { ...list[idx], idProofType: e.target.value }
                            setNewReservation({ ...newReservation, extraBeds: list })
                          }}
                          className="input-field mt-1"
                          placeholder="AADHAR / PASSPORT"
                        />
                      </div>
                    </div>
                  ))}
                  {(newReservation.extraBeds || []).length > 0 && (
                    <div className="text-right">
                      <button
                        type="button"
                        className="text-red-600 text-sm"
                        onClick={() => setNewReservation({
                          ...newReservation,
                          extraBeds: (newReservation.extraBeds || []).slice(0, -1)
                        })}
                        aria-label="Remove last extra bed"
                      >
                        Remove Last Bed
                      </button>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={newReservation.address || ''}
                      onChange={(e) => setNewReservation({ ...newReservation, address: e.target.value })}
                      className="input-field mt-1"
                      placeholder="Guest address"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan</label>
                    <select
                      value={newReservation.plan || 'EP'}
                      onChange={(e) => setNewReservation({ ...newReservation, plan: e.target.value as any })}
                      className="input-field mt-1"
                    >
                      <option value="EP">EP</option>
                      <option value="CP">CP</option>
                      <option value="MAP">MAP</option>
                      <option value="AP">AP</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="complimentary"
                    type="checkbox"
                    checked={!!newReservation.complimentary}
                    onChange={(e) => setNewReservation({ ...newReservation, complimentary: e.target.checked })}
                  />
                  <label htmlFor="complimentary" className="text-sm text-gray-700">Complimentary</label>
                </div>

                <div>
                  <label htmlFor="numberOfGuests" className="block text-sm font-medium text-gray-700">Number of Guests</label>
                  <input
                    id="numberOfGuests"
                    type="number"
                    value={newReservation.numberOfGuests}
                    onChange={(e) => setNewReservation({...newReservation, numberOfGuests: parseInt(e.target.value) || 1})}
                    className="input-field mt-1"
                    min="1"
                    max="10"
                    aria-label="Number of guests"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">Total Amount (₹)</label>
                    <input
                      id="totalAmount"
                      type="number"
                      value={newReservation.totalAmount}
                      onChange={(e) => setNewReservation({...newReservation, totalAmount: e.target.value})}
                      className="input-field mt-1"
                      min="0"
                      placeholder=""
                      aria-label="Total amount"
                    />
                  </div>
                  <div>
                    <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700">Deposit (₹)</label>
                    <input
                      id="depositAmount"
                      type="number"
                      value={newReservation.depositAmount}
                      onChange={(e) => setNewReservation({...newReservation, depositAmount: e.target.value})}
                      className="input-field mt-1"
                      min="0"
                      placeholder=""
                      aria-label="Deposit amount"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    id="paymentMethod"
                    value={newReservation.paymentMethod}
                    onChange={(e) => setNewReservation({...newReservation, paymentMethod: e.target.value})}
                    className="input-field mt-1"
                    aria-label="Payment method"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700">Special Requests</label>
                  <textarea
                    id="specialRequests"
                    value={newReservation.specialRequests}
                    onChange={(e) => setNewReservation({...newReservation, specialRequests: e.target.value})}
                    className="input-field mt-1"
                    rows={3}
                    placeholder="Any special requests or notes"
                    aria-label="Special requests"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddReservation}
                      className="btn-primary flex-1"
                      title="Create reservation"
                      aria-label="Create reservation"
                    >
                      Create Reservation
                    </button>
                    <button
                      onClick={() => setShowAddReservation(false)}
                      className="btn-secondary flex-1"
                      title="Cancel reservation creation"
                      aria-label="Cancel reservation creation"
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

export default Reservations 