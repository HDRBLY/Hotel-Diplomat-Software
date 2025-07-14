import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Mail, 
  MapPin,
  CheckCircle,
  Clock,
  User,
  X
} from 'lucide-react'
import { useNotification } from '../components/Notification'
import { useAuth } from '../components/AuthContext'
import Notification from '../components/Notification'

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
}

const Guests = () => {
  const { hasPermission } = useAuth()
  const [guests, setGuests] = useState<Guest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutGuest, setCheckoutGuest] = useState<Guest | null>(null)
  const [checkoutDetails, setCheckoutDetails] = useState({
    actualCheckOutDate: '',
    finalAmount: 0,
    additionalCharges: 0,
    paymentMethod: 'CASH',
    notes: ''
  })
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
      complimentary: false
    }
  )

  // Mock data
  useEffect(() => {
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
  }, [])

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guest.roomNumber.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || guest.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()) // Sort by most recent first

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

  const handleCheckIn = (guestId: string) => {
    if (!hasPermission('guests:edit')) {
      showNotification('error', 'You do not have permission to check in guests.')
      return
    }

    setGuests(guests.map(guest => 
      guest.id === guestId 
        ? { ...guest, status: 'checked-in' as const }
        : guest
    ))
    showNotification('success', 'Guest checked in successfully!')
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

  const handleCheckoutSubmit = () => {
    if (!checkoutGuest) return

    // Validation
    if (!checkoutDetails.actualCheckOutDate) {
      showNotification('error', 'Please select checkout date')
      return
    }

    if (checkoutDetails.finalAmount < 0) {
      showNotification('error', 'Final amount cannot be negative')
      return
    }

    // Update guest status and details
    setGuests(guests.map(guest => 
      guest.id === checkoutGuest.id 
        ? { 
            ...guest, 
            status: 'checked-out' as const,
            totalAmount: checkoutDetails.finalAmount,
            paidAmount: checkoutDetails.finalAmount,
            checkOutDate: checkoutDetails.actualCheckOutDate
          }
        : guest
    ))

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
  }

  const handleAddGuest = () => {
    if (!hasPermission('guests:create')) {
      showNotification('error', 'You do not have permission to add guests.')
      return
    }

    if (!newGuest.name || !newGuest.phone || !newGuest.idProof || !newGuest.roomNumber) {
      showNotification('error', 'Please fill all mandatory fields (Name, Phone, ID Proof, Room Number)')
      return
    }

    // Check if room is already occupied
    const isRoomOccupied = guests.some(guest => 
      guest.roomNumber === newGuest.roomNumber && guest.status === 'checked-in'
    )
    
    if (isRoomOccupied) {
      showNotification('error', 'This room is already occupied. Please select a different room.')
      return
    }

    // Validate minimum amount for non-complimentary bookings
    if (!newGuest.complimentary && newGuest.totalAmount < 1800) {
      showNotification('error', 'Total amount must be at least ₹1800 for non-complimentary bookings.')
      return
    }

    const guest: Guest = {
      id: Date.now().toString(),
      name: newGuest.name,
      email: newGuest.email,
      phone: newGuest.phone,
      roomNumber: newGuest.roomNumber,
      checkInDate: newGuest.checkInDate || new Date().toISOString().split('T')[0],
      checkOutDate: newGuest.checkOutDate,
      status: 'checked-in',
      totalAmount: newGuest.complimentary ? 0 : newGuest.totalAmount,
      paidAmount: newGuest.complimentary ? 0 : newGuest.paidAmount,
      address: newGuest.address,
      idProof: `${newGuest.idProofType}-${newGuest.idProof}`,
      category: newGuest.category,
      complimentary: !!newGuest.complimentary
    }

    setGuests([...guests, guest])
    
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
      complimentary: false
    })
    
    setShowAddGuest(false)
    
    // Show success message
    const message = guest.complimentary 
      ? 'Complimentary guest added successfully!' 
      : 'Guest added successfully!'
    showNotification('success', message)
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
            <button className="btn-secondary flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Guests List */}
      <div className="card">
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
                        <div className="text-sm font-medium text-gray-900">{guest.name}</div>
                        <div className="text-sm text-gray-500">{guest.email}</div>
                        <div className="text-sm text-gray-500">{guest.phone}</div>
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
      </div>

      {/* Guest Details Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setSelectedGuest(null)}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
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
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.address}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Proof</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedGuest.idProof}</p>
                </div>
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
                  <input
                    type="text"
                    value={newGuest.roomNumber}
                    onChange={(e) => setNewGuest({...newGuest, roomNumber: e.target.value})}
                    className="input-field mt-1"
                    placeholder="e.g., 101, 205"
                    required
                    title="Room number"
                  />
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
                    title="Select room type"
                    aria-label="Room Type"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check-in Date</label>
                    <input
                      type="date"
                      value={newGuest.checkInDate}
                      onChange={(e) => setNewGuest({...newGuest, checkInDate: e.target.value})}
                      className="input-field mt-1"
                      title="Check-in date"
                      placeholder="Check-in date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Check-out Date</label>
                    <input
                      type="date"
                      value={newGuest.checkOutDate}
                      onChange={(e) => setNewGuest({...newGuest, checkOutDate: e.target.value})}
                      min={newGuest.checkInDate || undefined}
                      className="input-field mt-1"
                      placeholder="Check-out date"
                      title="Check-out date"
                    />
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Total Amount (₹) <span className="text-red-500">*</span>
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
                    {!newGuest.complimentary && newGuest.totalAmount > 0 && newGuest.totalAmount < 1800 && (
                      <p className="text-red-500 text-xs mt-1">Minimum amount required is ₹1800</p>
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
                    onChange={e => setNewGuest({...newGuest, complimentary: e.target.checked, totalAmount: 0, paidAmount: 0})}
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
                  <input
                    type="date"
                    value={checkoutDetails.actualCheckOutDate}
                    onChange={(e) => setCheckoutDetails({...checkoutDetails, actualCheckOutDate: e.target.value})}
                    className="input-field mt-1"
                    min={checkoutGuest.checkInDate}
                    required
                    title="Select checkout date"
                    placeholder="Select checkout date"
                  />
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