import { useState, useEffect } from 'react'
import { Trash2, AlertTriangle, Eye, EyeOff, Search } from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import { useNotification } from '../components/Notification'

interface Room {
  id: string
  number: string
  type: string
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'cleaning'
  price: number
  floor: number
  amenities: string[]
}

const DeleteRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { user, hasPermission } = useAuth()
  const { showNotification } = useNotification()

  // Complete rooms data from the main Rooms section
  useEffect(() => {
    const completeRooms: Room[] = [
      { id: '1', number: '101', type: 'Standard', status: 'occupied', price: 1500, floor: 1, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '2', number: '102', type: 'Standard', status: 'available', price: 1500, floor: 1, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '3', number: '103', type: 'Standard', status: 'available', price: 1500, floor: 1, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '4', number: '104', type: 'Standard', status: 'maintenance', price: 1500, floor: 1, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '5', number: '202', type: 'Suite', status: 'reserved', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '6', number: '204', type: 'Deluxe', status: 'available', price: 2500, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony'] },
      { id: '7', number: '208', type: 'Deluxe', status: 'occupied', price: 2500, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony'] },
      { id: '8', number: '210', type: 'Deluxe', status: 'available', price: 2500, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony'] },
      { id: '9', number: '212', type: 'Deluxe', status: 'cleaning', price: 2500, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony'] },
      { id: '10', number: '214', type: 'Deluxe', status: 'available', price: 2500, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony'] },
      { id: '11', number: '216', type: 'Suite', status: 'reserved', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '12', number: '211', type: 'Presidential', status: 'reserved', price: 8000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'] },
      { id: '13', number: '218', type: 'Suite', status: 'available', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '14', number: '220', type: 'Suite', status: 'available', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '15', number: '221', type: 'Suite', status: 'occupied', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '16', number: '222', type: 'Suite', status: 'available', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '17', number: '223', type: 'Suite', status: 'available', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '18', number: '224', type: 'Suite', status: 'available', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '19', number: '225', type: 'Suite', status: 'available', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '20', number: '226', type: 'Suite', status: 'available', price: 4000, floor: 2, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi'] },
      { id: '21', number: '301', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '22', number: '302', type: 'Standard', status: 'occupied', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '23', number: '303', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '24', number: '304', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '25', number: '305', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '26', number: '306', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '27', number: '307', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '28', number: '308', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '29', number: '309', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '30', number: '312', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '31', number: '314', type: 'Standard', status: 'available', price: 1500, floor: 3, amenities: ['WiFi', 'TV', 'AC'] },
      { id: '32', number: '401', type: 'Presidential', status: 'available', price: 8000, floor: 4, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'] },
      { id: '33', number: '411', type: 'Presidential', status: 'available', price: 8000, floor: 4, amenities: ['WiFi', 'TV', 'AC', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'] }
    ]
    setRooms(completeRooms)
    setFilteredRooms(completeRooms)
  }, [])

  // Filter rooms based on search term
  useEffect(() => {
    const filtered = rooms.filter(room =>
      room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.status.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredRooms(filtered)
  }, [searchTerm, rooms])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'occupied':
        return 'bg-red-100 text-red-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'reserved':
        return 'bg-blue-100 text-blue-800'
      case 'cleaning':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDeleteClick = (room: Room) => {
    setSelectedRoom(room)
    setShowDeleteModal(true)
    setDeleteReason('')
    setPassword('')
  }

  const handleDeleteConfirm = async () => {
    if (!selectedRoom) return

    if (!deleteReason.trim()) {
      showNotification('error', 'Please provide a reason for deletion')
      return
    }

    if (!password.trim()) {
      showNotification('error', 'Please enter your password')
      return
    }

    // Verify password (in real app, this would be an API call)
    const correctPassword = user?.role === 'admin' ? 'admin123' : 'manager123'
    
    if (password !== correctPassword) {
      showNotification('error', 'Incorrect password')
      return
    }

    setIsDeleting(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Remove room from list
      const updatedRooms = rooms.filter(room => room.id !== selectedRoom.id)
      setRooms(updatedRooms)

      // Log deletion (in real app, this would be sent to server)
      console.log('Room deleted:', {
        room: selectedRoom,
        reason: deleteReason,
        deletedBy: user?.name,
        deletedAt: new Date().toISOString()
      })

      showNotification('success', `Room ${selectedRoom.number} has been deleted successfully`)
      setShowDeleteModal(false)
      setSelectedRoom(null)
      setDeleteReason('')
      setPassword('')
    } catch (error) {
      showNotification('error', 'Failed to delete room. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setSelectedRoom(null)
    setDeleteReason('')
    setPassword('')
  }

  if (!hasPermission('rooms:delete')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to delete rooms.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delete Rooms</h1>
            <p className="text-gray-600 mt-1">
              Permanently remove rooms from the system. This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4" />
            <span>Admin & Manager access only</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search rooms by number, type, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Room {room.number}</h3>
                <p className="text-sm text-gray-600">{room.type}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                {room.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Floor:</span>
                <span className="font-medium">{room.floor}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">₹{room.price}/night</span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-1">Amenities:</p>
              <div className="flex flex-wrap gap-1">
                {room.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleDeleteClick(room)}
              disabled={room.status === 'occupied'}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                room.status === 'occupied'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              {room.status === 'occupied' ? 'Cannot Delete (Occupied)' : 'Delete Room'}
            </button>
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
          <p className="text-gray-600">Try adjusting your search criteria.</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Room</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-4 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-800">
                Are you sure you want to delete <strong>Room {selectedRoom.number}</strong> ({selectedRoom.type})?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for deletion *
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Please provide a reason for deleting this room..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting || !deleteReason.trim() || !password.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeleteRooms 