import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import Notification, { useNotification } from '../components/Notification'
import { io, Socket } from 'socket.io-client'
import { 
  Bed, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Utensils,
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  Eye,
  X,
  Check,
  Search,
  Filter
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

interface Room {
  id: string
  number: string
  type: string
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'cleaning'
  floor: number
  price: number
  amenities: string[]
  description: string
  currentGuest?: {
    name: string
    phone: string
    checkInDate: string
    checkOutDate: string
    guestCount: number
  }
}

interface MenuItem {
  id: string
  category: string
  name: string
  description: string
  price: number
  gstRate: number
  available: boolean
  image: string
}

interface FoodOrder {
  id: string
  roomNumber: string
  guestName: string
  items: Array<{
    menuItemId: string
    name: string
    price: number
    quantity: number
    gstRate: number
    total: number
  }>
  totalAmount: number
  gstAmount: number
  finalAmount: number
  orderDate: string
  status: 'pending' | 'preparing' | 'delivered' | 'cancelled'
  notes: string
}

const RoomService = () => {
  const { hasPermission, user } = useAuth()
  const { notification, showNotification, hideNotification } = useNotification()
  
  // Check if user has room service permissions
  if (!hasPermission('room-service:view')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Room Service.</p>
        </div>
      </div>
    )
  }
  
  const [rooms, setRooms] = useState<Room[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<FoodOrder | null>(null)
  const [editingOrder, setEditingOrder] = useState<FoodOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  
  // Order form state
  const [orderForm, setOrderForm] = useState<{
    items: Array<{
      menuItemId: string
      name: string
      price: number
      quantity: number
      gstRate: number
      total: number
    }>
    notes: string
  }>({
    items: [],
    notes: ''
  })

  // Load data from backend
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch rooms
        const roomsRes = await fetch(`${BACKEND_URL}/api/rooms`)
        if (!roomsRes.ok) throw new Error('Failed to fetch rooms')
        const roomsData = await roomsRes.json()
        if (roomsData.success) {
          setRooms(roomsData.data || [])
        }

        // Fetch guests to get current room occupants
        const guestsRes = await fetch(`${BACKEND_URL}/api/guests`)
        if (guestsRes.ok) {
          const guestsData = await guestsRes.json()
          if (guestsData.success) {
            const checkedInGuests = guestsData.data.filter((guest: any) => guest.status === 'checked-in')
            
            // Update rooms with current guest information
            setRooms(prevRooms => 
              prevRooms.map(room => {
                const guest = checkedInGuests.find((g: any) => g.roomNumber === room.number)
                return guest ? {
                  ...room,
                  status: 'occupied' as const,
                  currentGuest: {
                    name: guest.name,
                    phone: guest.phone,
                    checkInDate: guest.checkInDate,
                    checkOutDate: guest.checkOutDate || '',
                    guestCount: guest.guestCount || 1
                  }
                } : room
              })
            )
          }
        }

        // Fetch menu items
        const menuRes = await fetch('/src/data/menu.json')
        if (menuRes.ok) {
          const menuData = await menuRes.json()
          setMenuItems(menuData)
        }

        // Fetch food orders
        const ordersRes = await fetch(`${BACKEND_URL}/api/room-service-orders`)
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          if (ordersData.success) {
            setFoodOrders(ordersData.data || [])
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data'
        setError(errorMessage)
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
      console.log('Connected to backend for real-time room service updates')
    })

    newSocket.on('room_updated', () => {
      fetchData()
    })

    newSocket.on('guest_checked_in', () => {
      fetchData()
    })

    newSocket.on('guest_checked_out', () => {
      fetchData()
    })

    newSocket.on('room_service_order_updated', (updatedOrder) => {
      setFoodOrders(prev => prev.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ))
    })

    newSocket.on('room_service_order_created', (newOrder) => {
      setFoodOrders(prev => [newOrder, ...prev])
    })

    return () => {
      if (newSocket) {
        newSocket.disconnect()
        newSocket.removeAllListeners()
      }
    }
  }, [])

  // Filter rooms based on search and status
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (room.currentGuest?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Handle room selection for food ordering
  const handleRoomSelect = (room: Room) => {
    if (room.status !== 'occupied') {
      showNotification('error', 'Only occupied rooms can place food orders')
      return
    }
    
    setSelectedRoom(room)
    
    // Check if room already has an order
    const existingOrder = foodOrders.find(order => 
      order.roomNumber === room.number && 
      (order.status === 'pending' || order.status === 'preparing')
    )
    
    if (existingOrder) {
      setCurrentOrder(existingOrder)
      setEditingOrder(existingOrder)
      setOrderForm({
        items: existingOrder.items,
        notes: existingOrder.notes
      })
    } else {
      setCurrentOrder(null)
      setEditingOrder(null)
      setOrderForm({
        items: [],
        notes: ''
      })
    }
    
    setShowMenuModal(true)
  }

  // Add item to order
  const handleAddItem = (menuItem: MenuItem) => {
    const existingItemIndex = orderForm.items.findIndex(item => item.menuItemId === menuItem.id)
    
    if (existingItemIndex >= 0) {
      // Update quantity
      const updatedItems = [...orderForm.items]
      updatedItems[existingItemIndex].quantity += 1
      updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].price
      setOrderForm(prev => ({ ...prev, items: updatedItems }))
    } else {
      // Add new item
      const newItem = {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        gstRate: menuItem.gstRate,
        total: menuItem.price
      }
      setOrderForm(prev => ({ ...prev, items: [...prev.items, newItem] }))
    }
  }

  // Update item quantity
  const handleUpdateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderForm(prev => ({
        ...prev,
        items: prev.items.filter(item => item.menuItemId !== menuItemId)
      }))
      return
    }

    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.menuItemId === menuItemId
          ? { ...item, quantity, total: quantity * item.price }
          : item
      )
    }))
  }

  // Calculate order totals
  const calculateOrderTotals = () => {
    const subtotal = orderForm.items.reduce((sum, item) => sum + item.total, 0)
    const gstAmount = orderForm.items.reduce((sum, item) => {
      const itemGst = (item.total * item.gstRate) / 100
      return sum + itemGst
    }, 0)
    const finalAmount = subtotal + gstAmount

    return { subtotal, gstAmount, finalAmount }
  }

  // Save food order
  const handleSaveOrder = async () => {
    if (!hasPermission('room-service:create') && !hasPermission('room-service:edit')) {
      showNotification('error', 'You do not have permission to manage orders')
      return
    }

    if (!selectedRoom || orderForm.items.length === 0) {
      showNotification('error', 'Please add at least one item to the order')
      return
    }

    const { subtotal, gstAmount, finalAmount } = calculateOrderTotals()

    const orderData = {
      roomNumber: selectedRoom.number,
      guestName: selectedRoom.currentGuest?.name || 'Unknown',
      items: orderForm.items,
      totalAmount: subtotal,
      gstAmount: gstAmount,
      finalAmount: finalAmount,
      notes: orderForm.notes,
      status: editingOrder ? editingOrder.status : 'pending'
    }

    try {
      let response
      if (editingOrder) {
        // Update existing order
        response = await fetch(`${BACKEND_URL}/api/room-service-orders/${editingOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        })
      } else {
        // Create new order
        response = await fetch(`${BACKEND_URL}/api/room-service-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        })
      }

      if (!response.ok) throw new Error('Failed to save order')

      const result = await response.json()
      if (result.success) {
        showNotification('success', editingOrder ? 'Order updated successfully' : 'Order placed successfully')
        setShowMenuModal(false)
        setSelectedRoom(null)
        setCurrentOrder(null)
        setEditingOrder(null)
        setOrderForm({ items: [], notes: '' })
        
        // Refresh data
        const ordersRes = await fetch(`${BACKEND_URL}/api/room-service-orders`)
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          if (ordersData.success) {
            setFoodOrders(ordersData.data || [])
          }
        }
      } else {
        throw new Error(result.message || 'Failed to save order')
      }
    } catch (error) {
      console.error('Error saving order:', error)
      showNotification('error', 'Failed to save order. Please try again.')
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'occupied': return 'bg-blue-100 text-blue-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'cleaning': return 'bg-purple-100 text-purple-800'
      case 'reserved': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get order status color
  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'preparing': return 'bg-blue-100 text-blue-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading room service data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Room Service</h1>
        <p className="text-gray-600">Manage food orders and room service for all rooms</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search rooms, guests, or room numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRooms.map((room) => {
          const roomOrder = foodOrders.find(order => 
            order.roomNumber === room.number && 
            (order.status === 'pending' || order.status === 'preparing')
          )
          
          return (
            <div
              key={room.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Room {room.number}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                    {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Bed className="h-4 w-4 mr-2" />
                    {room.type}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    Floor {room.floor}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">₹{room.price}/day</span>
                  </div>
                </div>

                {room.currentGuest && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <h4 className="font-medium text-blue-900 mb-1">Current Guest</h4>
                    <p className="text-sm text-blue-700">{room.currentGuest.name}</p>
                    <p className="text-xs text-blue-600">{room.currentGuest.phone}</p>
                  </div>
                )}

                {roomOrder && (
                  <div className="bg-orange-50 p-3 rounded-lg mb-4">
                    <h4 className="font-medium text-orange-900 mb-1">Active Order</h4>
                    <p className="text-sm text-orange-700">
                      {roomOrder.items.length} item(s) - ₹{roomOrder.finalAmount}
                    </p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getOrderStatusColor(roomOrder.status)}`}>
                      {roomOrder.status.charAt(0).toUpperCase() + roomOrder.status.slice(1)}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRoomSelect(room)}
                    disabled={room.status !== 'occupied'}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      room.status === 'occupied'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Utensils className="h-4 w-4 inline mr-1" />
                    {roomOrder ? 'Update Order' : 'Place Order'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Menu Modal */}
      {showMenuModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingOrder ? 'Update Order' : 'Place Order'} - Room {selectedRoom.number}
                </h2>
                <button
                  onClick={() => {
                    setShowMenuModal(false)
                    setSelectedRoom(null)
                    setCurrentOrder(null)
                    setEditingOrder(null)
                    setOrderForm({ items: [], notes: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Menu Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu Items</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {menuItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-600">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">₹{item.price}</p>
                            <p className="text-xs text-gray-500">{item.gstRate}% GST</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddItem(item)}
                          disabled={!item.available}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            item.available
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {item.available ? 'Add to Order' : 'Not Available'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Order */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Order</h3>
                  
                  {orderForm.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Utensils className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No items in order</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orderForm.items.map((item) => (
                        <div key={item.menuItemId} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">₹{item.price} each</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">₹{item.total}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.menuItemId, item.quantity - 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.menuItemId, item.quantity + 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="border-t pt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Subtotal:</span>
                          <span>₹{calculateOrderTotals().subtotal}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>GST:</span>
                          <span>₹{calculateOrderTotals().gstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>₹{calculateOrderTotals().finalAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={orderForm.notes}
                          onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Special instructions or notes..."
                        />
                      </div>

                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => {
                            setShowMenuModal(false)
                            setSelectedRoom(null)
                            setCurrentOrder(null)
                            setEditingOrder(null)
                            setOrderForm({ items: [], notes: '' })
                          }}
                          className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveOrder}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="h-4 w-4" />
                          {editingOrder ? 'Update Order' : 'Place Order'}
                        </button>
                      </div>
                    </div>
                  )}
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
      />
    </div>
  )
}

export default RoomService
