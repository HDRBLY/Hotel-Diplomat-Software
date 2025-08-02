import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { 
  Users, 
  Bed, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface DashboardStats {
  occupiedRooms: number
  availableRooms: number
  totalRooms: number
  todayCheckins: number
  todayCheckouts: number
  todayRevenue: number
  pendingReservations: number
  maintenanceRooms: number
  cleaningRooms: number
  reservedRooms: number
  totalGuests: number
  occupancyRate: number
  revenue: number
}

interface RecentActivity {
  id: string
  type: 'checkin' | 'checkout' | 'reservation' | 'payment'
  guestName: string
  roomNumber: string
  time: string
  status: 'completed' | 'pending' | 'cancelled'
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    occupiedRooms: 4,
    availableRooms: 40,
    totalRooms: 47,
    todayCheckins: 8,
    todayCheckouts: 5,
    todayRevenue: 45000,
    pendingReservations: 12,
    maintenanceRooms: 1,
    cleaningRooms: 1,
    reservedRooms: 2,
    totalGuests: 4,
    occupancyRate: 8.5,
    revenue: 45000
  })

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch dashboard stats
        const statsResponse = await fetch('http://localhost:3001/api/reports/dashboard')
        if (!statsResponse.ok) {
          throw new Error(`Failed to fetch dashboard stats: ${statsResponse.status}`)
        }
        const statsData = await statsResponse.json()
        
        if (statsData.success) {
          setStats(statsData.data)
        } else {
          throw new Error('Failed to fetch dashboard stats')
        }

        // Fetch recent activities
        const activitiesResponse = await fetch('http://localhost:3001/api/activities')
        if (!activitiesResponse.ok) {
          throw new Error(`Failed to fetch activities: ${activitiesResponse.status}`)
        }
        const activitiesData = await activitiesResponse.json()
        
        if (activitiesData.success) {
          setRecentActivity(activitiesData.data.slice(0, 4)) // Get latest 4 activities
        } else {
          throw new Error('Failed to fetch activities')
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data'
        setError(errorMessage)
        // Fallback to mock data if API fails
        setStats({
          occupiedRooms: 4,
          availableRooms: 40,
          totalRooms: 47,
          todayCheckins: 8,
          todayCheckouts: 5,
          todayRevenue: 45000,
          pendingReservations: 12,
          maintenanceRooms: 1,
          cleaningRooms: 1,
          reservedRooms: 2,
          totalGuests: 4,
          occupancyRate: 8.5,
          revenue: 45000
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()

    // Setup WebSocket connection for real-time updates
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Connected to backend for real-time updates')
    })

    newSocket.on('activity_updated', (activity) => {
      setRecentActivity(prev => [activity, ...prev.slice(0, 3)])
    })

    newSocket.on('guest_created', () => {
      // Refresh dashboard stats when new guest is added
      fetchDashboardData()
    })

    newSocket.on('room_updated', () => {
      // Refresh dashboard stats when room status changes
      fetchDashboardData()
    })

    return () => {
      if (newSocket) {
        newSocket.disconnect()
        newSocket.removeAllListeners()
      }
    }
  }, [])

  const occupancyData = [
    { name: 'Mon', occupancy: 60 },
    { name: 'Tue', occupancy: 65 },
    { name: 'Wed', occupancy: 70 },
    { name: 'Thu', occupancy: 75 },
    { name: 'Fri', occupancy: 80 },
    { name: 'Sat', occupancy: 85 },
    { name: 'Sun', occupancy: 64 }
  ]

  const revenueData = [
    { name: 'Mon', revenue: 80000 },
    { name: 'Tue', revenue: 85000 },
    { name: 'Wed', revenue: 90000 },
    { name: 'Thu', revenue: 95000 },
    { name: 'Fri', revenue: 100000 },
    { name: 'Sat', revenue: 110000 },
    { name: 'Sun', revenue: 125000 }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'guest_checked_in':
      case 'checkin':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'guest_checked_out':
      case 'checkout':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'guest_created':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'reservation':
        return <Calendar className="h-4 w-4 text-purple-500" />
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getActivityText = (type: string) => {
    switch (type) {
      case 'guest_checked_in':
        return 'Guest Checked In'
      case 'guest_checked_out':
        return 'Guest Checked Out'
      case 'guest_created':
        return 'Guest Checked In'
      case 'checkin':
        return 'Guest Checked In'
      case 'checkout':
        return 'Guest Checked Out'
      case 'reservation':
        return 'Reservation'
      case 'payment':
        return 'Payment'
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600">Welcome to Hotel Diplomat Residency (HDR) Front Desk Management</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
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
            <p className="text-gray-900 font-medium mb-2">Failed to load dashboard</p>
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
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Guests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalGuests}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Bed className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Occupied Rooms</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.occupiedRooms}/{stats.totalRooms}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Today&apos;s Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.revenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Occupancy Chart */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Occupancy</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="occupancy" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue Chart */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Revenue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getActivityIcon(activity.type)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.guestName} - Room {activity.roomNumber}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {getActivityText(activity.type)} • {activity.time}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard 