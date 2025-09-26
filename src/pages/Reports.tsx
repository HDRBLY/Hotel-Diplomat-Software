import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useNotification } from '../components/Notification'
import { formatToDDMMYYYY } from '../utils/date'
import { calculateBill } from '../utils/billing'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Bed, 
  Calendar,
  Download,
  Trash2,
  FileText
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
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

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
  const [weeklyRevenueData, setWeeklyRevenueData] = useState<Array<{ name: string; revenue: number; gstAt5Percent?: number }>>([])
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<Array<{ month: string; revenue: number; bookings: number; gstAt5Percent?: number }>>([])
  const [roomTypeData, setRoomTypeData] = useState<any[]>([])
  const [guestSourceData, setGuestSourceData] = useState<any[]>([])
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

  // Function to convert number to words
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    
    if (num === 0) return 'Zero'
    if (num < 10) return ones[num]
    if (num < 20) return teens[num - 10]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '')
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + numberToWords(num % 100) : '')
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '')
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '')
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + numberToWords(num % 10000000) : '')
  }

  // Function to generate and download bill for a specific guest
  const downloadGuestBill = async (guest: any) => {
    try {
      // Use the original bill number that was stored when the guest checked out
      const billNumber = guest.billNumber || '0001'

      // Format dates properly using shared utilities
      const formattedCheckInDate = formatToDDMMYYYY(guest.checkInDate)
      const formattedCheckOutDate = formatToDDMMYYYY(guest.checkOutDate || new Date().toISOString().split('T')[0])

      // Current time for bill
      const now = new Date()
      const billTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })

      // Get room details to get the actual room price for proper complimentary handling
      const roomResponse = await fetch(`${BACKEND_URL}/api/rooms`)
      const roomsPayload = await roomResponse.json()
      const rooms = roomsPayload && roomsPayload.success ? roomsPayload.data || [] : []
      const room = rooms.find((r: any) => r.number === guest.roomNumber)
      const roomBasePrice = room ? (room.price ?? 0) : 0

      // Use shared billing calculation for proper tax breakdown
      const billingInputs = {
        checkInDate: guest.checkInDate,
        checkOutDate: guest.checkOutDate || new Date().toISOString().split('T')[0],
        roomNumber: guest.roomNumber,
        guest: guest,
        checkoutDetails: {
          finalAmount: guest.totalAmount || 0,
          additionalCharges: 0, // Additional charges will be calculated from guest data
          laundryCharges: 0,    // These will be set to 0 for now as they're not stored in guest record
          halfDayCharges: 0,    // These will be set to 0 for now as they're not stored in guest record
          actualCheckOutDate: guest.checkOutDate || new Date().toISOString().split('T')[0]
        },
        roomBasePrice: roomBasePrice // Use actual room price from backend
      }

      const breakdown = calculateBill(billingInputs)

      // Debug logging to check the breakdown
      console.log('Billing breakdown for guest:', guest.name, {
        isComplimentary: breakdown.isComplimentary,
        roomRent: breakdown.roomRent,
        additionalCharges: breakdown.additionalCharges,
        laundryCharges: breakdown.laundryCharges,
        halfDayCharges: breakdown.halfDayCharges,
        totalAmount: breakdown.totalAmount,
        pricePerDay: breakdown.pricePerDay,
        guestData: {
          complimentary: guest.complimentary,
          paymentMethod: guest.paymentMethod,
          totalAmount: guest.totalAmount,
          roomBasePrice: roomBasePrice
        }
      })

      // Convert total amount to words
      const amountInWords = numberToWords(breakdown.totalAmount)

      // Generate bill HTML
      const billHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tax Invoice - Hotel Diplomat Residency</title>
          <style>
            @media print {
              @page { size: A4; margin: 10mm; }
              html, body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .charges-table, .signature-row { page-break-inside: avoid; }
              .invoice-container { height: 277mm; padding: 6mm; box-sizing: border-box; display: flex; flex-direction: column; }
              .content { flex: 1 1 auto; }
              .signature-row { margin-top: auto; margin-bottom: 6mm; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              font-size: 11.5px;
              line-height: 1.3;
            }
            .header { text-align: center; margin-bottom: 12px; }
            .hotel-name { font-size: 26px; font-weight: bold; margin-bottom: 4px; }
            .hotel-details { font-size: 11px; color: #444; line-height: 1.5; }
            .invoice-title { font-size: 16px; font-weight: bold; text-align: center; margin: 12px 0; }
            .guest-info { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .guest-details, .stay-details { width: 48%; }
            .section-title { font-weight: bold; margin-bottom: 8px; font-size: 15px; }
            .info-row { margin-bottom: 6px; font-size: 13px; }
            .charges-table { width: 100%; border-collapse: collapse; margin: 12px 0; table-layout: fixed; }
            .charges-table th, .charges-table td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              text-align: left; 
              font-size: 11px;
              word-wrap: break-word;
            }
            .charges-table th { background-color: #f5f5f5; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .bank-details { margin-top: 16px; }
            .footer { margin-top: 16px; text-align: center; font-size: 10px; }
            .print-btn { 
              position: fixed; 
              top: 20px; 
              right: 20px; 
              padding: 10px 20px; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              background: #007bff; 
            }
            .print-btn:hover { background: #0056b3; }
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
          <button class="print-btn no-print" onclick="window.print()">Print Bill</button>
          
          <div class="invoice-container">
          <div class="header">
            <div class="hotel-name">Hotel Diplomat Residency</div>
            <div class="hotel-details">
              (A Unit of Aronax Enterprises Private Limited)<br>
              GST No: 09AANCA1929Q1ZY | CIN: U521000L2015PTC274988<br>
              63 Prakash Tower, Choupla Road Civil Lines, Bareilly - 243001 (Uttar Pradesh) INDIA<br>
              Mail: diplomatresidency.bly@gmail.com<br>
              Ph No: +91-9219414284
            </div>
          </div>

          <div class="invoice-title">TAX INVOICE</div>
          ${breakdown.isComplimentary ? '<div style="text-align:center;margin-top:4px;color:#16a34a;font-weight:600;">COMPLIMENTARY STAY - ROOM RENT WAIVED</div>' : ''}

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
              <div class="info-row editable" contenteditable="false">Payment Method: ${(guest.paymentMethod || 'CASH').toUpperCase()}</div>
              </div>
              <div class="stay-details">
                <div class="section-title">Stay Details:</div>
                              <div class="info-row editable" contenteditable="false">Date of Arrival: ${formattedCheckInDate}</div>
              <div class="info-row editable" contenteditable="false">Date of Departure: ${formattedCheckOutDate}</div>
              <div class="info-row editable" contenteditable="false">Bill No: ${billNumber}</div>
              <div class="info-row editable" contenteditable="false">ROOM NO: ${guest.roomNumber}</div>
              <div class="info-row editable" contenteditable="false">PAX: 1</div>
              <div class="info-row editable" contenteditable="false">Plan: ${guest.plan || 'EP'}</div>
              <div class="info-row editable" contenteditable="false">Check In Time: 12:00</div>
              <div class="info-row editable" contenteditable="false">Check Out Time: ${billTime}</div>
              <div class="info-row editable" contenteditable="false">Payment Method: ${(guest.paymentMethod || 'CASH').toUpperCase()}</div>
              </div>
            </div>

          <table class="charges-table">
            <thead>
              <tr>
                <th>Room No.</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Taxable Value</th>
                <th>Tax Rate</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <!-- Room Rent Row -->
              <tr>
                <td class="editable" contenteditable="false">${guest.roomNumber}</td>
                <td class="editable" contenteditable="false">Room Rent (${breakdown.daysDiff} days)</td>
                <td class="editable" contenteditable="false">1</td>
                <td class="editable" contenteditable="false">₹${breakdown.pricePerDay}</td>
                <td class="editable" contenteditable="false">₹${breakdown.roomRentTaxableValue.toFixed(2)}</td>
                            <td>5%</td>
                <td class="editable" contenteditable="false">₹${breakdown.roomRentCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.roomRentSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.roomRent}</td>
              </tr>

              <!-- Extra Bed Charges Row -->
              ${breakdown.extraBedCharges > 0 ? `
                <tr>
                  <td class="editable" contenteditable="false">${guest.roomNumber}</td>
                  <td class="editable" contenteditable="false">Extra Bed Charges</td>
                  <td class="editable" contenteditable="false">1</td>
                  <td class="editable" contenteditable="false">₹${breakdown.extraBedCharges}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.extraBedTaxableValue.toFixed(2)}</td>
                  <td>5%</td>
                  <td class="editable" contenteditable="false">₹${breakdown.extraBedCgst.toFixed(2)}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.extraBedSgst.toFixed(2)}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.extraBedCharges}</td>
                </tr>
              ` : ''}

              <!-- Additional Charges Row -->
              ${breakdown.additionalCharges > 0 ? `
                <tr>
                  <td class="editable" contenteditable="false">${guest.roomNumber}</td>
                  <td class="editable" contenteditable="false">Fooding/Additional Charges</td>
                  <td class="editable" contenteditable="false">1</td>
                  <td class="editable" contenteditable="false">₹${breakdown.additionalCharges}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.foodingTaxableValue.toFixed(2)}</td>
                  <td>5%</td>
                  <td class="editable" contenteditable="false">₹${breakdown.foodingCgst.toFixed(2)}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.foodingSgst.toFixed(2)}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.additionalCharges}</td>
                </tr>
              ` : ''}

              <!-- Laundry Charges Row -->
              ${breakdown.laundryCharges > 0 ? `
                <tr>
                  <td class="editable" contenteditable="false">${guest.roomNumber}</td>
                  <td class="editable" contenteditable="false">Laundry Charges</td>
                  <td class="editable" contenteditable="false">1</td>
                  <td class="editable" contenteditable="false">₹${breakdown.laundryCharges}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.laundryTaxableValue.toFixed(2)}</td>
                  <td>5%</td>
                  <td class="editable" contenteditable="false">₹${breakdown.laundryCgst.toFixed(2)}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.laundrySgst.toFixed(2)}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.laundryCharges}</td>
                </tr>
              ` : ''}

              <!-- Half Day Charges Row -->
              ${breakdown.halfDayCharges > 0 ? `
                <tr>
                  <td class="editable" contenteditable="false">${guest.roomNumber}</td>
                  <td class="editable" contenteditable="false">Half Day/Late Checkout Charges</td>
                  <td class="editable" contenteditable="false">1</td>
                  <td class="editable" contenteditable="false">₹${breakdown.halfDayCharges}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.halfDayTaxableValue.toFixed(2)}</td>
                  <td>5%</td>
                  <td class="editable" contenteditable="false">₹${breakdown.halfDayCgst.toFixed(2)}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.halfDaySgst.toFixed(2)}</td>
                  <td class="editable" contenteditable="false">₹${breakdown.halfDayCharges}</td>
                </tr>
              ` : ''}

              <!-- Total Row -->
              <tr class="total-row">
                <td colspan="5">TOTAL</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalTaxableValue.toFixed(2)}</td>
                <td></td>
                <td class="editable" contenteditable="false">₹${breakdown.totalCgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalSgst.toFixed(2)}</td>
                <td class="editable" contenteditable="false">₹${breakdown.totalAmount}</td>
              </tr>
            </tbody>
          </table>

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
              <div class="signature-line">Guest Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Authorised Signatory</div>
            </div>
          </div>

          <div class="footer">
            <div style="margin-bottom: 6px;">*Please Deposit your Key to the Receptionists*</div>
            <div>THANK YOU FOR YOUR VISIT, PLEASE VISIT AGAIN !!!!</div>
          </div>
          </div>

          <script>
            // Print functionality only
          </script>
        </body>
        </html>
      `

      // Open bill in new window and trigger print
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(billHTML)
        printWindow.document.close()
        
        // Wait for content to load then trigger print
        printWindow.onload = () => {
          printWindow.print()
        }
      }

      showNotification('success', 'Bill generated successfully!')
    } catch (error) {
      console.error('Error generating bill:', error)
      showNotification('error', 'Error generating bill. Please try again.')
    }
  }

  const exportToPDF = (data: any[], filename: string) => {
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                .page-break { page-break-before: always; }
              }
              
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: white;
                color: #333;
              }
              
              .header {
                text-align: center;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              
              .hotel-name {
                font-size: 28px;
                font-weight: bold;
                color: #1e40af;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              
              .report-title {
                font-size: 20px;
                color: #374151;
                margin: 10px 0 0 0;
                font-weight: 600;
              }
              
              .report-date {
                font-size: 14px;
                color: #6b7280;
                margin: 5px 0 0 0;
              }
              
              .summary-section {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
              }
              
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 15px;
              }
              
              .metric-card {
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 15px;
                text-align: center;
              }
              
              .metric-value {
                font-size: 24px;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 5px;
              }
              
              .metric-label {
                font-size: 12px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .data-section {
                margin-top: 30px;
              }
              
              .section-title {
                font-size: 18px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #e5e7eb;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                background: white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              
              th {
                background: #f3f4f6;
                color: #374151;
                font-weight: 600;
                padding: 12px 8px;
                text-align: left;
                border-bottom: 2px solid #d1d5db;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              td {
                padding: 12px 8px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 14px;
              }
              
              tr:hover {
                background: #f9fafb;
              }
              
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 12px;
              }
              
              .generated-by {
                font-style: italic;
                margin-top: 10px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="hotel-name">Hotel Diplomat</h1>
              <h2 class="report-title">${filename}</h2>
              <p class="report-date">Generated on: ${today}</p>
              ${dateRange === 'custom' && startDate && endDate ? 
                `<p class="report-date">Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>` : 
                ''
              }
            </div>
            
            <div class="summary-section">
              <h3 class="section-title">Executive Summary</h3>
              <div class="summary-grid">
                <div class="metric-card">
                  <div class="metric-value">${reportData.occupancyRate}%</div>
                  <div class="metric-label">Occupancy Rate</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">₹${reportData.totalRevenue.toLocaleString()}</div>
                  <div class="metric-label">Total Revenue</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">₹${reportData.averageRoomRate}</div>
                  <div class="metric-label">Average Room Rate</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${reportData.totalGuests}</div>
                  <div class="metric-label">Total Guests</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${reportData.totalBookings}</div>
                  <div class="metric-label">Total Bookings</div>
                </div>
                <div class="metric-card">
                  <div class="metric-value">${reportData.cancellationRate}%</div>
                  <div class="metric-label">Cancellation Rate</div>
                </div>
              </div>
            </div>
            
            <div class="data-section">
              <h3 class="section-title">Detailed Report</h3>
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
            </div>
            
            <div class="footer">
              <p>This report was generated automatically by Hotel Diplomat Management System</p>
              <p class="generated-by">Generated by: ${localStorage.getItem('userName') || 'System Administrator'}</p>
            </div>
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
        filename = 'Hotel Performance Overview'
        break
      case 'revenue':
        data = monthlyRevenueData.map(item => ({
          Month: item.month,
          Revenue: `₹${item.revenue.toLocaleString()}`,
          Bookings: item.bookings,
          'Average Revenue per Booking': `₹${item.bookings > 0 ? Math.round(item.revenue / item.bookings) : 0}`
        }))
        filename = `Revenue Analysis Report ${startDate ? `(${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})` : ''}`
        break
      case 'occupancy':
        data = occupancyData.map(item => ({
          Day: item.day,
          'Occupancy Rate': `${item.rate}%`,
          'Available Rooms': item.availableRooms,
          'Total Rooms': item.totalRooms,
          'Occupied Rooms': item.totalRooms - item.availableRooms
        }))
        filename = 'Weekly Occupancy Report'
        break
      case 'guests':
        data = guestData.map(item => ({
          'Guest Name': item.name,
          'Room Number': item.roomNumber,
          'Check-in Date': item.checkInDate,
          'Check-out Date': item.checkOutDate,
          Status: item.status,
          'Amount Paid': `₹${item.amount.toLocaleString()}`
        }))
        filename = 'Guest Management Report'
        break
      case 'rooms':
        data = roomData.map(item => ({
          'Room Number': item.number,
          'Room Type': item.type.charAt(0).toUpperCase() + item.type.slice(1),
          Status: item.status,
          'Last Cleaned': item.lastCleaned,
          'Revenue Generated': `₹${item.revenue.toLocaleString()}`
        }))
        filename = 'Room Status Report'
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
        const overviewResponse = await fetch(`${BACKEND_URL}/api/reports/overview?${params}`)
        const overviewData = await overviewResponse.json()
        if (overviewData.success) {
          setReportData(overviewData.data)
        }

        // Fetch revenue data with date range
        const revenueResponse = await fetch(`${BACKEND_URL}/api/reports/revenue?${params}`)
        const revenueResult = await revenueResponse.json()
        if (revenueResult.success) {
          const mapped = (revenueResult.data as Array<{ date: string; revenue: number; bookings?: number; averageRate?: number }>).map(item => {
            return {
              date: item.date,
              revenue: item.revenue,
              bookings: item.bookings,
              averageRate: item.averageRate,
              gstAt5Percent: Math.round(item.revenue * 0.05)
            }
          })
          setRevenueData(mapped)
        }

        // Fetch occupancy data with date range
        const occupancyResponse = await fetch(`${BACKEND_URL}/api/reports/occupancy?${params}`)
        const occupancyResult = await occupancyResponse.json()
        if (occupancyResult.success) {
          setOccupancyData(occupancyResult.data)
        }

        // Fetch guest data with date range
        const guestResponse = await fetch(`${BACKEND_URL}/api/reports/guests?${params}`)
        const guestResult = await guestResponse.json()
        if (guestResult.success) {
          setGuestData(guestResult.data)
        }

        // Fetch room data with date range
        const roomResponse = await fetch(`${BACKEND_URL}/api/reports/rooms?${params}`)
        const roomResult = await roomResponse.json()
        if (roomResult.success) {
          setRoomData(roomResult.data)
        }

        // Fetch chart data
        const monthlyRevenueResponse = await fetch(`${BACKEND_URL}/api/reports/charts/monthly-revenue?${params}`)
        const monthlyRevenueResult = await monthlyRevenueResponse.json()
        if (monthlyRevenueResult.success) {
          setMonthlyRevenueData(monthlyRevenueResult.data)
        }

        const roomTypeResponse = await fetch(`${BACKEND_URL}/api/reports/charts/room-types?${params}`)
        const roomTypeResult = await roomTypeResponse.json()
        if (roomTypeResult.success) {
          setRoomTypeData(roomTypeResult.data)
        }

        const guestSourceResponse = await fetch(`${BACKEND_URL}/api/reports/charts/guest-sources?${params}`)
        const guestSourceResult = await guestSourceResponse.json()
        if (guestSourceResult.success) {
          setGuestSourceData(guestSourceResult.data)
        }
      } catch (error) {
        console.error('Error fetching reports data:', error)
      }
    }

    fetchReportsData()

    // Setup WebSocket connection for real-time updates
    const newSocket = io(BACKEND_URL)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      // Connected to backend for real-time reports updates
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
      const response = await fetch(`${BACKEND_URL}/api/reports/clear-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hdr_auth_token') || ''}`,
        },
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh all data
        const fetchReportsData = async () => {
          try {
            // Fetch overview data
            const overviewResponse = await fetch(`${BACKEND_URL}/api/reports/overview`)
            const overviewData = await overviewResponse.json()
            if (overviewData.success) {
              setReportData(overviewData.data)
            }

            // Fetch revenue data
            const revenueResponse = await fetch(`${BACKEND_URL}/api/reports/revenue`)
            const revenueResult = await revenueResponse.json()
            if (revenueResult.success) {
              const mapped = (revenueResult.data as Array<{ date: string; revenue: number; bookings?: number; averageRate?: number }>).map(item => {
                return {
                  date: item.date,
                  revenue: item.revenue,
                  bookings: item.bookings,
                  averageRate: item.averageRate,
                  gstAt5Percent: Math.round(item.revenue * 0.05)
                }
              })
              setRevenueData(mapped)
            }

            // Fetch occupancy data
            const occupancyResponse = await fetch(`${BACKEND_URL}/api/reports/occupancy`)
            const occupancyResult = await occupancyResponse.json()
            if (occupancyResult.success) {
              setOccupancyData(occupancyResult.data)
            }

            // Fetch guest data
            const guestResponse = await fetch(`${BACKEND_URL}/api/reports/guests`)
            const guestResult = await guestResponse.json()
            if (guestResult.success) {
              setGuestData(guestResult.data)
            }

            // Fetch room data
            const roomResponse = await fetch(`${BACKEND_URL}/api/reports/rooms`)
            const roomResult = await roomResponse.json()
            if (roomResult.success) {
              setRoomData(roomResult.data)
            }

            // Fetch chart data
            const monthlyRevenueResponse = await fetch(`${BACKEND_URL}/api/reports/charts/monthly-revenue`)
            const monthlyRevenueResult = await monthlyRevenueResponse.json()
            if (monthlyRevenueResult.success) {
              setMonthlyRevenueData(monthlyRevenueResult.data)
            }

            const roomTypeResponse = await fetch(`${BACKEND_URL}/api/reports/charts/room-types`)
            const roomTypeResult = await roomTypeResponse.json()
            if (roomTypeResult.success) {
              setRoomTypeData(roomTypeResult.data)
            }

            const guestSourceResponse = await fetch(`${BACKEND_URL}/api/reports/charts/guest-sources`)
            const guestSourceResult = await guestSourceResponse.json()
            if (guestSourceResult.success) {
              setGuestSourceData(guestSourceResult.data)
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
                    <th className="px-4 py-2 text-left">Month</th>
                    <th className="px-4 py-2 text-left">Revenue</th>
                    <th className="px-4 py-2 text-left">Bookings</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyRevenueData.map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{row.month}</td>
                      <td className="px-4 py-2">₹{row.revenue.toLocaleString()}</td>
                      <td className="px-4 py-2">{row.bookings}</td>
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
            <LineChart data={monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
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
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {detailedReport === 'revenue' && (
                  <>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GST 5%
                </th>
                  </>
                )}
                {detailedReport === 'occupancy' && (
                  <>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Occupancy Rate
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available Rooms
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Rooms
                    </th>
                  </>
                )}
                {detailedReport === 'guest' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-in Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailedReport === 'revenue' && revenueData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{data.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{data.averageRate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{data.gstAt5Percent}
                  </td>
                </tr>
              ))}
              {detailedReport === 'occupancy' && occupancyData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.day}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.availableRooms}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.totalRooms}
                  </td>
                </tr>
              ))}
              {detailedReport === 'guest' && guestData.map((data, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.roomNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.checkInDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{data.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.status === 'Checked-out' && (
                      <button
                        onClick={() => downloadGuestBill(data)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        title="Download Bill"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Download Bill
                      </button>
                    )}
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