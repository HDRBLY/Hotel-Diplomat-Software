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
}

const Reservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showAddReservation, setShowAddReservation] = useState(false)
  const { notification, showNotification, hideNotification } = useNotification()
  const [newReservation, setNewReservation] = useState({
    guestName: '',
    email: '',
    phone: '',
    roomNumber: '',
    roomType: 'Standard',
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    totalAmount: 0,
    depositAmount: 0,
    specialRequests: '',
    paymentMethod: 'UPI'
  })

  // Available room types
  const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Presidential']
  const paymentMethods = ['UPI', 'Bank Transfer', 'Credit Card', 'Cash', 'Pending']

  // Mock data - Only 2 reserved rooms for management
  useEffect(() => {
    setReservations([
      {
        id: '1',
        guestName: 'Mr. Aron Sir',
        email: 'aron.sir@hoteldiplomat.com',
        phone: '+91 98765 43210',
        roomNumber: '216',
        roomType: 'Suite',
        checkInDate: '2024-01-01',
        checkOutDate: '2024-12-31',
        numberOfGuests: 1,
        status: 'confirmed',
        totalAmount: 0,
        depositAmount: 0,
        specialRequests: 'Permanently reserved for Upper Management - Mr. Aron Sir',
        bookingDate: '2024-01-01',
        paymentMethod: 'Management'
      },
      
    ])
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
  }).sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()) // Sort by most recent first

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

  const handleStatusChange = (reservationId: string, newStatus: Reservation['status']) => {
    setReservations(reservations.map(reservation => 
      reservation.id === reservationId 
        ? { ...reservation, status: newStatus }
        : reservation
    ))
  }

  const handleDeleteReservation = (reservationId: string) => {
    setReservations(reservations.filter(reservation => reservation.id !== reservationId))
  }

  const handleAddReservation = () => {
    if (!newReservation.guestName || !newReservation.phone || !newReservation.roomNumber || 
        !newReservation.checkInDate || !newReservation.checkOutDate) {
      showNotification('error', 'Please fill all mandatory fields (Guest Name, Phone, Room Number, Check-in Date, Check-out Date)')
      return
    }

    // Check if check-out date is after check-in date
    if (new Date(newReservation.checkOutDate) <= new Date(newReservation.checkInDate)) {
      showNotification('error', 'Check-out date must be after check-in date')
      return
    }

    const reservation: Reservation = {
      id: Date.now().toString(),
      guestName: newReservation.guestName,
      email: newReservation.email,
      phone: newReservation.phone,
      roomNumber: newReservation.roomNumber,
      roomType: newReservation.roomType,
      checkInDate: newReservation.checkInDate,
      checkOutDate: newReservation.checkOutDate,
      numberOfGuests: newReservation.numberOfGuests,
      status: 'pending',
      totalAmount: newReservation.totalAmount,
      depositAmount: newReservation.depositAmount,
      specialRequests: newReservation.specialRequests,
      bookingDate: new Date().toISOString().split('T')[0],
      paymentMethod: newReservation.paymentMethod
    }

    setReservations([...reservations, reservation])
    
    // Reset form
    setNewReservation({
      guestName: '',
      email: '',
      phone: '',
      roomNumber: '',
      roomType: 'Standard',
      checkInDate: '',
      checkOutDate: '',
      numberOfGuests: 1,
      totalAmount: 0,
      depositAmount: 0,
      specialRequests: '',
      paymentMethod: 'UPI'
    })
    
    setShowAddReservation(false)
    showNotification('success', 'Reservation added successfully!')
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
                        <div className="text-sm font-medium text-gray-900">{reservation.guestName}</div>
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
                      <button 
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit reservation"
                        aria-label="Edit reservation"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Guest Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReservation.guestName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReservation.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReservation.phone}</p>
                </div>
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
                    <label className="block text-sm font-medium text-gray-700">Check-in</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.checkInDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check-out</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.checkOutDate}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of Guests</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReservation.numberOfGuests}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedReservation.status)}`}>
                    {selectedReservation.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="mt-1 text-sm text-gray-900">₹{selectedReservation.totalAmount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Deposit</label>
                    <p className="mt-1 text-sm text-gray-900">₹{selectedReservation.depositAmount}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReservation.paymentMethod}</p>
                </div>
                {selectedReservation.specialRequests && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Special Requests</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReservation.specialRequests}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking Date</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReservation.bookingDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Reservation Modal */}
      {showAddReservation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700">
                      Room Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="roomNumber"
                      type="text"
                      value={newReservation.roomNumber}
                      onChange={(e) => setNewReservation({...newReservation, roomNumber: e.target.value})}
                      className="input-field mt-1"
                      placeholder="e.g., 101, 205"
                      required
                      aria-label="Room number"
                    />
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
                      onChange={(e) => setNewReservation({...newReservation, totalAmount: parseInt(e.target.value) || 0})}
                      className="input-field mt-1"
                      min="0"
                      aria-label="Total amount"
                    />
                  </div>
                  <div>
                    <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700">Deposit (₹)</label>
                    <input
                      id="depositAmount"
                      type="number"
                      value={newReservation.depositAmount}
                      onChange={(e) => setNewReservation({...newReservation, depositAmount: parseInt(e.target.value) || 0})}
                      className="input-field mt-1"
                      min="0"
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