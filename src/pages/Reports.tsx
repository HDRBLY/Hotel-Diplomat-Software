import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useNotification } from '../components/Notification'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Bed, 
  Calendar,
  Download,
  Filter,
  Trash2
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Dialog } from '@headlessui/react'

interface ReportData {
  occupancyRate: number
  totalRevenue: number
  averageRoomRate: number
  totalGuests: number
  totalBookings: number
  cancellationRate: number
}

const Reports = () => {
  const { notification, showNotification, hideNotification } = useNotification()
  const [reportData, setReportData] = useState<ReportData>({
    occupancyRate: 0,
    totalRevenue: 0,
    averageRoomRate: 0,
    totalGuests: 0,
    totalBookings: 0,
    cancellationRate: 0
  })
  const [selectedReport, setSelectedReport] = useState('overview')
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [modalOpen, setModalOpen] = useState<null | 'revenue' | 'roomType' | 'occupancy' | 'guestSource'>(null)
  const [detailedReport, setDetailedReport] = useState<'revenue' | 'occupancy' | 'guest'>('revenue')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [occupancyData, setOccupancyData] = useState<any[]>([])
  const [guestData, setGuestData] = useState<any[]>([])
  const [roomData, setRoomData] = useState<any[]>([])
  const [isClearing, setIsClearing] = useState(false)

  // Export functionality
  type ReportRow = Record<string, string | number>;
  const exportToCSV = (data: ReportRow[], filename: string) => {
    const headers = Object.keys(data[0]).join(',')
    const csvContent = [headers, ...data.map(row => Object.values(row).join(','))].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = (data: any[], filename: string) => {
    // Simple PDF export using window.print() for now
    // In a real app, you'd use a library like jsPDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>${filename}</h1>
            <table>
              <thead>
                <tr>
                  ${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.map(row => `
                  <tr>
                    ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleDateRangeChange = (range: string) => {
    setDateRange(range)
    setShowCustomDateRange(false)
    
    // Set default date ranges
    const today = new Date()
    const start = new Date()
    const end = new Date()
    
    switch (range) {
      case 'week':
        start.setDate(today.getDate() - 7)
        break
      case 'month':
        start.setMonth(today.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(today.getMonth() - 3)
        break
      case 'year':
        start.setFullYear(today.getFullYear() - 1)
        break
      case 'custom':
        setShowCustomDateRange(true)
        return
    }
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const handleCustomDateRange = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates')
      return
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot be after end date')
      return
    }
    
    setDateRange('custom')
    setShowCustomDateRange(false)
  }

  const getFilteredData = () => {
    if (!startDate || !endDate) return revenueData
    
    return revenueData.filter(item => {
      const itemDate = new Date(item.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return itemDate >= start && itemDate <= end
    })
  }

  const handleExport = (type: 'csv' | 'pdf') => {
    let data: any[] = []
    let filename = ''

    switch (selectedReport) {
      case 'overview':
        data = [{
          'Occupancy Rate': `${reportData.occupancyRate}%`,
          'Total Revenue': `₹${reportData.totalRevenue.toLocaleString()}`,
          'Average Room Rate': `₹${reportData.averageRoomRate}`,
          'Total Guests': reportData.totalGuests,
          'Total Bookings': reportData.totalBookings,
          'Cancellation Rate': `${reportData.cancellationRate}%`
        }]
        filename = 'Hotel Overview'
        break
      case 'revenue':
        data = getFilteredData().map(item => ({
          Date: item.date,
          Revenue: `₹${item.revenue.toLocaleString()}`,
          Bookings: item.bookings,
          'Average Rate': `₹${item.averageRate.toLocaleString()}`
        }))
        filename = `Revenue Report ${startDate ? `(${startDate} to ${endDate})` : ''}`
        break
      case 'occupancy':
        data = occupancyData.map(item => ({
          Date: item.date,
          'Occupancy Rate': `${item.rate}%`,
          'Available Rooms': item.availableRooms,
          'Total Rooms': item.totalRooms
        }))
        filename = 'Occupancy Report'
        break
      case 'guests':
        data = guestData.map(item => ({
          Name: item.name,
          'Room Number': item.roomNumber,
          'Check-in Date': item.checkInDate,
          'Check-out Date': item.checkOutDate,
          Status: item.status,
          Amount: `₹${item.amount.toLocaleString()}`
        }))
        filename = 'Guest Report'
        break
      case 'rooms':
        data = roomData.map(item => ({
          'Room Number': item.number,
          Type: item.type,
          Status: item.status,
          'Last Cleaned': item.lastCleaned,
          'Revenue Generated': `₹${item.revenue.toLocaleString()}`
        }))
        filename = 'Room Report'
        break
    }

    if (type === 'csv') {
      exportToCSV(data, filename)
    } else {
      exportToPDF(data, filename)
    }
  }

  // Fetch data from backend and setup WebSocket
  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        // Build query parameters for date filtering
        const params = new URLSearchParams()
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        
        // Fetch overview data with date range
        const overviewResponse = await fetch(`http://localhost:3001/api/reports/overview?${params}`)
        const overviewData = await overviewResponse.json()
        if (overviewData.success) {
          setReportData(overviewData.data)
        }

        // Fetch revenue data with date range
        const revenueResponse = await fetch(`http://localhost:3001/api/reports/revenue?${params}`)
        const revenueResult = await revenueResponse.json()
        if (revenueResult.success) {
          setRevenueData(revenueResult.data)
        }

        // Fetch occupancy data with date range
        const occupancyResponse = await fetch(`http://localhost:3001/api/reports/occupancy?${params}`)
        const occupancyResult = await occupancyResponse.json()
        if (occupancyResult.success) {
          setOccupancyData(occupancyResult.data)
        }

        // Fetch guest data with date range
        const guestResponse = await fetch(`http://localhost:3001/api/reports/guests?${params}`)
        const guestResult = await guestResponse.json()
        if (guestResult.success) {
          setGuestData(guestResult.data)
        }

        // Fetch room data with date range
        const roomResponse = await fetch(`http://localhost:3001/api/reports/rooms?${params}`)
        const roomResult = await roomResponse.json()
        if (roomResult.success) {
          setRoomData(roomResult.data)
        }
      } catch (error) {
        console.error('Error fetching reports data:', error)
      }
    }

    fetchReportsData()

    // Setup WebSocket connection for real-time updates
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Connected to backend for real-time reports updates')
    })

    newSocket.on('guest_created', () => {
      // Refresh reports when new guest is added
      fetchReportsData()
    })

    newSocket.on('guest_updated', () => {
      // Refresh reports when guest status changes
      fetchReportsData()
    })

    newSocket.on('room_updated', () => {
      // Refresh reports when room status changes
      fetchReportsData()
    })

    newSocket.on('data_cleared', () => {
      // Refresh all reports when data is cleared
      fetchReportsData()
    })

    return () => {
      newSocket.disconnect()
    }
  }, [dateRange, startDate, endDate])

  // Clear all data function
  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return
    }

    setIsClearing(true)
    try {
      const response = await fetch('http://localhost:3001/api/reports/clear-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh all data
        const fetchReportsData = async () => {
          try {
            // Fetch overview data
            const overviewResponse = await fetch('http://localhost:3001/api/reports/overview')
            const overviewData = await overviewResponse.json()
            if (overviewData.success) {
              setReportData(overviewData.data)
            }

            // Fetch revenue data
            const revenueResponse = await fetch('http://localhost:3001/api/reports/revenue')
            const revenueResult = await revenueResponse.json()
            if (revenueResult.success) {
              setRevenueData(revenueResult.data)
            }

            // Fetch occupancy data
            const occupancyResponse = await fetch('http://localhost:3001/api/reports/occupancy')
            const occupancyResult = await occupancyResponse.json()
            if (occupancyResult.success) {
              setOccupancyData(occupancyResult.data)
            }

            // Fetch guest data
            const guestResponse = await fetch('http://localhost:3001/api/reports/guests')
            const guestResult = await guestResponse.json()
            if (guestResult.success) {
              setGuestData(guestResult.data)
            }

            // Fetch room data
            const roomResponse = await fetch('http://localhost:3001/api/reports/rooms')
            const roomResult = await roomResponse.json()
            if (roomResult.success) {
              setRoomData(roomResult.data)
            }
          } catch (error) {
            console.error('Error fetching reports data:', error)
          }
        }

        fetchReportsData()
        showNotification('success', 'All data cleared successfully!')
      } else {
        showNotification('error', 'Failed to clear data. Please try again.')
      }
    } catch (error) {
      console.error('Error clearing data:', error)
      showNotification('error', 'Failed to clear data. Please try again.')
    } finally {
      setIsClearing(false)
    }
  }

  const monthlyRevenueData = [
    { month: 'Jan', revenue: 850000, bookings: 280 },
    { month: 'Feb', revenue: 920000, bookings: 310 },
    { month: 'Mar', revenue: 880000, bookings: 295 },
    { month: 'Apr', revenue: 950000, bookings: 320 },
    { month: 'May', revenue: 1020000, bookings: 340 },
    { month: 'Jun', revenue: 980000, bookings: 330 },
    { month: 'Jul', revenue: 1100000, bookings: 365 },
    { month: 'Aug', revenue: 1150000, bookings: 380 },
    { month: 'Sep', revenue: 1080000, bookings: 360 },
    { month: 'Oct', revenue: 1120000, bookings: 375 },
    { month: 'Nov', revenue: 1050000, bookings: 350 },
    { month: 'Dec', revenue: 1250000, bookings: 420 }
  ]

  const roomTypeData = [
    { name: 'Standard', value: 14, color: '#3b82f6' },
    { name: 'Deluxe', value: 6, color: '#10b981' },
    { name: 'Suite', value: 10, color: '#8b5cf6' },
    { name: 'Presidential', value: 2, color: '#f59e0b' }
  ]



  const guestSourceData = [
    { source: 'Direct', bookings: 120, percentage: 37.5 },
    { source: 'Online Travel Agencies', bookings: 85, percentage: 26.6 },
    { source: 'Corporate', bookings: 65, percentage: 20.3 },
    { source: 'Travel Agents', bookings: 35, percentage: 10.9 },
    { source: 'Other', bookings: 15, percentage: 4.7 }
  ]

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']



  // Modal content for each section
  const renderModalContent = () => {
    switch (modalOpen) {
      case 'revenue':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Detailed Revenue Report</h2>
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Revenue</th>
                    <th className="px-4 py-2 text-left">Bookings</th>
                    <th className="px-4 py-2 text-left">Avg Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredData().map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">₹{row.revenue.toLocaleString()}</td>
                      <td className="px-4 py-2">{row.bookings}</td>
                      <td className="px-4 py-2">₹{row.averageRate.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'roomType':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Room Type Distribution</h2>
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Room Type</th>
                    <th className="px-4 py-2 text-left">Count</th>
                    <th className="px-4 py-2 text-left">Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roomTypeData.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2">{row.value}</td>
                      <td className="px-4 py-2">{((row.value / roomTypeData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'occupancy':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Weekly Occupancy</h2>
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Day</th>
                    <th className="px-4 py-2 text-left">Occupancy Rate</th>
                    <th className="px-4 py-2 text-left">Available Rooms</th>
                    <th className="px-4 py-2 text-left">Total Rooms</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {occupancyData.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{row.day}</td>
                      <td className="px-4 py-2">{row.rate}%</td>
                      <td className="px-4 py-2">{row.availableRooms}</td>
                      <td className="px-4 py-2">{row.totalRooms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'guestSource':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Guest Source Details</h2>
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Source</th>
                    <th className="px-4 py-2 text-left">Bookings</th>
                    <th className="px-4 py-2 text-left">Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {guestSourceData.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{row.source}</td>
                      <td className="px-4 py-2">{row.bookings}</td>
                      <td className="px-4 py-2">{row.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive hotel performance insights and analytics</p>
          {dateRange === 'custom' && startDate && endDate && (
            <p className="text-sm text-blue-600 mt-1">
              Showing data from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="input-field"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            {dateRange === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field"
                  placeholder="End Date"
                />
                <button
                  onClick={handleCustomDateRange}
                  className="btn-primary"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleExport('csv')}
              className="btn-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              className="btn-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </button>
            <button 
              onClick={handleClearData}
              disabled={isClearing}
              className="btn-danger flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.occupancyRate}%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{reportData.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Bed className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Room Rate</p>
              <p className="text-2xl font-bold text-gray-900">₹{reportData.averageRoomRate}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Guests</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalGuests}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
            <button 
              onClick={() => setModalOpen('revenue')}
              className="text-primary-600 hover:text-primary-900 text-sm"
            >
              View Details
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getFilteredData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Room Type Distribution */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Room Type Distribution</h3>
            <button 
              onClick={() => setModalOpen('roomType')}
              className="text-primary-600 hover:text-primary-900 text-sm"
            >
              View Details
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roomTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roomTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Occupancy */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Weekly Occupancy</h3>
            <button 
              onClick={() => setModalOpen('occupancy')}
              className="text-primary-600 hover:text-primary-900 text-sm"
            >
              View Details
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rate" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Guest Source */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Guest Source</h3>
            <button 
              onClick={() => setModalOpen('guestSource')}
              className="text-primary-600 hover:text-primary-900 text-sm"
            >
              View Details
            </button>
          </div>
          <div className="space-y-3">
            {guestSourceData.map((source, index) => (
              <div key={source.source} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: COLORS[index] }}
                  ></div>
                  <span className="text-sm text-gray-700">{source.source}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{source.bookings}</div>
                  <div className="text-xs text-gray-500">{source.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Reports Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Detailed Performance</h3>
          <div className="flex gap-2">
            <select 
              value={detailedReport}
              onChange={(e) => setDetailedReport(e.target.value as 'revenue' | 'occupancy' | 'guest')}
              className="input-field"
            >
              <option value="revenue">Revenue Report</option>
              <option value="occupancy">Occupancy Report</option>
              <option value="guest">Guest Report</option>
            </select>
            <button className="btn-secondary flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ADR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancellations
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredData().map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Date(data.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{data.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.round((data.bookings / 47) * 100)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{Math.round(data.revenue / data.bookings)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.round(data.bookings * 0.12)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen !== null} onClose={() => setModalOpen(null)} className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-30" />
        <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-full">
          {renderModalContent()}
        </Dialog.Panel>
      </Dialog>
    </div>
  )
}

export default Reports 