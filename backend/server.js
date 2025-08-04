const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com', 'https://your-app.vercel.app', 'https://hotel-diplomat-software.vercel.app']
      : 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://your-app.vercel.app', 'https://hotel-diplomat-software.vercel.app']
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Data file paths
const dataDir = path.join(__dirname, 'data');
const roomsFile = path.join(dataDir, 'rooms.json');
const guestsFile = path.join(dataDir, 'guests.json');
const usersFile = path.join(dataDir, 'users.json');
const reservationsFile = path.join(dataDir, 'reservations.json');
const activitiesFile = path.join(dataDir, 'activities.json');

// Helper function to read JSON files
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

// Helper function to write JSON files
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
};

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.get('/api/rooms', (req, res) => {
  try {
    const rooms = readJsonFile(roomsFile);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/rooms', (req, res) => {
  try {
    const rooms = readJsonFile(roomsFile);
    const newRoom = {
      id: Date.now().toString(),
      ...req.body,
      status: 'AVAILABLE'
    };
    rooms.push(newRoom);
    writeJsonFile(roomsFile, rooms);
    io.emit('room_added', newRoom);
    res.json(newRoom);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add room' });
  }
});

app.put('/api/rooms/:id', (req, res) => {
  try {
    const rooms = readJsonFile(roomsFile);
    const roomIndex = rooms.findIndex(room => room.id === req.params.id);
    if (roomIndex !== -1) {
      rooms[roomIndex] = { ...rooms[roomIndex], ...req.body };
      writeJsonFile(roomsFile, rooms);
      io.emit('room_updated', rooms[roomIndex]);
      res.json(rooms[roomIndex]);
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update room' });
  }
});

app.delete('/api/rooms/:id', (req, res) => {
  try {
    const rooms = readJsonFile(roomsFile);
    const filteredRooms = rooms.filter(room => room.id !== req.params.id);
    writeJsonFile(roomsFile, filteredRooms);
    io.emit('room_deleted', req.params.id);
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Room shift endpoint
app.post('/api/rooms/:id/shift', (req, res) => {
  try {
    const { destinationRoomNumber, shiftDate, shiftTime, reason, authorizedBy, additionalNotes } = req.body;
    
    // Read current data
    const rooms = readJsonFile(roomsFile);
    const guests = readJsonFile(guestsFile);
    const activities = readJsonFile(activitiesFile);
    
    // Find source room
    const sourceRoom = rooms.find(room => room.id === req.params.id);
    if (!sourceRoom) {
      return res.status(404).json({ error: 'Source room not found' });
    }
    
    // Find destination room
    const destinationRoom = rooms.find(room => room.number === destinationRoomNumber);
    if (!destinationRoom) {
      return res.status(404).json({ error: 'Destination room not found' });
    }
    
    // Find guest in source room
    const guest = guests.find(g => g.roomNumber === sourceRoom.number && g.status === 'checked-in');
    if (!guest) {
      return res.status(404).json({ error: 'No guest found in source room' });
    }
    
    // Update source room
    sourceRoom.status = 'AVAILABLE';
    sourceRoom.guest = null;
    sourceRoom.category = 'solo'; // Reset to default
    
    // Update destination room
    destinationRoom.status = 'OCCUPIED';
    destinationRoom.guest = guest.id;
    destinationRoom.category = guest.category;
    
    // Update guest
    guest.roomNumber = destinationRoomNumber;
    
    // Record activity
    const shiftActivity = {
      id: Date.now(),
      type: 'room_shift',
      timestamp: new Date().toISOString(),
      details: {
        guestId: guest.id,
        guestName: guest.primaryGuest,
        fromRoom: sourceRoom.number,
        toRoom: destinationRoomNumber,
        shiftDate,
        shiftTime,
        reason,
        authorizedBy,
        additionalNotes
      }
    };
    
    activities.push(shiftActivity);
    
    // Save all changes
    writeJsonFile(roomsFile, rooms);
    writeJsonFile(guestsFile, guests);
    writeJsonFile(activitiesFile, activities);
    
    // Emit WebSocket events
    io.emit('room_shifted', {
      sourceRoom,
      destinationRoom,
      guest,
      activity: shiftActivity
    });
    
    res.json({
      message: 'Room shift completed successfully',
      sourceRoom,
      destinationRoom,
      guest
    });
  } catch (error) {
    console.error('Room shift error:', error);
    res.status(500).json({ error: 'Failed to shift room' });
  }
});

app.get('/api/guests', (req, res) => {
  try {
    const guests = readJsonFile(guestsFile);
    res.json(guests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guests' });
  }
});

app.post('/api/guests', (req, res) => {
  try {
    const guests = readJsonFile(guestsFile);
    const rooms = readJsonFile(roomsFile);
    
    const newGuest = {
      id: Date.now().toString(),
      ...req.body,
      status: 'checked-in',
      checkInDate: new Date().toISOString().split('T')[0]
    };
    
    // Update room status
    const room = rooms.find(r => r.number === newGuest.roomNumber);
    if (room) {
      room.status = 'OCCUPIED';
      room.guest = newGuest.id;
      room.category = newGuest.category;
      writeJsonFile(roomsFile, rooms);
    }
    
    guests.push(newGuest);
    writeJsonFile(guestsFile, guests);
    
    // Record activity
    const activities = readJsonFile(activitiesFile);
    const checkinActivity = {
      id: Date.now(),
      type: 'guest_checked_in',
      timestamp: new Date().toISOString(),
      details: {
        guestId: newGuest.id,
        guestName: newGuest.primaryGuest,
        roomNumber: newGuest.roomNumber,
        checkInDate: newGuest.checkInDate
      }
    };
    activities.push(checkinActivity);
    writeJsonFile(activitiesFile, activities);
    
    io.emit('guest_checked_in', newGuest);
    res.json(newGuest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add guest' });
  }
});

app.put('/api/guests/:id', (req, res) => {
  try {
    const guests = readJsonFile(guestsFile);
    const rooms = readJsonFile(roomsFile);
    const activities = readJsonFile(activitiesFile);
    
    const guestIndex = guests.findIndex(guest => guest.id === req.params.id);
    if (guestIndex !== -1) {
      const oldGuest = guests[guestIndex];
      guests[guestIndex] = { ...oldGuest, ...req.body };
      
      // If guest is being checked out
      if (req.body.status === 'checked-out') {
        guests[guestIndex].checkOutDate = new Date().toISOString().split('T')[0];
        
        // Set room to cleaning status
        const room = rooms.find(r => r.number === guests[guestIndex].roomNumber);
        if (room) {
          room.status = 'CLEANING';
          room.guest = null;
        }
        
        // Also set any previously shifted source rooms to cleaning
        const shiftActivities = activities.filter(a => 
          a.type === 'room_shift' && 
          a.details.guestId === req.params.id
        );
        
        shiftActivities.forEach(activity => {
          const sourceRoom = rooms.find(r => r.number === activity.details.fromRoom);
          if (sourceRoom) {
            sourceRoom.status = 'CLEANING';
          }
        });
        
        // Record checkout activity
        const checkoutActivity = {
          id: Date.now(),
          type: 'guest_checked_out',
          timestamp: new Date().toISOString(),
          details: {
            guestId: guests[guestIndex].id,
            guestName: guests[guestIndex].primaryGuest,
            roomNumber: guests[guestIndex].roomNumber,
            checkOutDate: guests[guestIndex].checkOutDate,
            additionalPayment: req.body.additionalPayment || 0
          }
        };
        activities.push(checkoutActivity);
        writeJsonFile(activitiesFile, activities);
        
        io.emit('guest_checked_out', guests[guestIndex]);
      }
      
      writeJsonFile(guestsFile, guests);
      writeJsonFile(roomsFile, rooms);
      res.json(guests[guestIndex]);
    } else {
      res.status(404).json({ error: 'Guest not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update guest' });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = readJsonFile(usersFile);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users/login', (req, res) => {
  try {
    const users = readJsonFile(usersFile);
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          role: user.role 
        } 
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/reservations', (req, res) => {
  try {
    const reservations = readJsonFile(reservationsFile);
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

app.post('/api/reservations', (req, res) => {
  try {
    const reservations = readJsonFile(reservationsFile);
    const newReservation = {
      id: Date.now().toString(),
      ...req.body,
      status: 'confirmed'
    };
    reservations.push(newReservation);
    writeJsonFile(reservationsFile, reservations);
    io.emit('reservation_added', newReservation);
    res.json(newReservation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reservation' });
  }
});

app.get('/api/activities', (req, res) => {
  try {
    const activities = readJsonFile(activitiesFile);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Dashboard reports
app.get('/api/reports/dashboard', (req, res) => {
  try {
    const rooms = readJsonFile(roomsFile);
    const guests = readJsonFile(guestsFile);
    const activities = readJsonFile(activitiesFile);
    
    const totalRooms = rooms.length;
    const checkedInGuests = guests.filter(g => g.status === 'checked-in');
    
    // Calculate total guests (primary + secondary + extra beds)
    const totalGuests = checkedInGuests.reduce((sum, guest) => {
      let guestCount = 1; // Primary guest
      if (guest.secondaryGuest) guestCount += 1;
      if (guest.extraBeds) guestCount += parseInt(guest.extraBeds);
      return sum + guestCount;
    }, 0);
    
    // Calculate today's check-ins and check-outs
    const today = new Date().toISOString().split('T')[0];
    const todayCheckins = activities.filter(activity => 
      activity.type === 'guest_checked_in' && 
      activity.details.checkInDate === today
    ).length;
    
    const todayCheckouts = activities.filter(activity => 
      activity.type === 'guest_checked_out' && 
      activity.details.checkOutDate === today
    ).length;
    
    // Calculate today's revenue
    let todayRevenue = 0;
    
    // Revenue from currently checked-in guests
    checkedInGuests.forEach(guest => {
      if (guest.paidAmount) {
        todayRevenue += parseFloat(guest.paidAmount);
      }
    });
    
    // Revenue from guests who checked out today
    const todayCheckoutActivities = activities.filter(activity => 
      activity.type === 'guest_checked_out' && 
      activity.details.checkOutDate === today
    );
    
    todayCheckoutActivities.forEach(activity => {
      if (activity.details.additionalPayment) {
        todayRevenue += parseFloat(activity.details.additionalPayment);
      }
    });
    
    // Calculate today's occupancy rate based on room usage frequency today
    let todayRoomUsage = {}; // Track how many times each room was used today
    
    // Add currently occupied rooms
    rooms.forEach(room => {
      if (room.status === 'OCCUPIED') {
        todayRoomUsage[room.number] = (todayRoomUsage[room.number] || 0) + 1;
      }
    });
    
    // Add rooms that were checked out today
    guests.forEach(guest => {
      if (guest.status === 'checked-out' && guest.checkOutDate) {
        const checkoutDate = new Date(guest.checkOutDate).toISOString().split('T')[0];
        if (checkoutDate === today && guest.roomNumber) {
          todayRoomUsage[guest.roomNumber] = (todayRoomUsage[guest.roomNumber] || 0) + 1;
        }
      }
    });
    
    // Count total room usages today
    const todayOccupiedCount = Object.values(todayRoomUsage).reduce((sum, count) => sum + count, 0);
    const occupancyRate = totalRooms > 0 ? ((todayOccupiedCount / totalRooms) * 100).toFixed(1) : 0;
    
    res.json({
      totalRooms,
      totalGuests,
      todayCheckins,
      todayCheckouts,
      todayRevenue: Math.round(todayRevenue),
      occupancyRate: parseFloat(occupancyRate)
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard report' });
  }
});

// Reports endpoints with date filtering
app.get('/api/reports/revenue', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const guests = readJsonFile(guestsFile);
    const activities = readJsonFile(activitiesFile);
    
    let filteredGuests = guests;
    if (startDate && endDate) {
      filteredGuests = guests.filter(guest => {
        const checkInDate = new Date(guest.checkInDate);
        return checkInDate >= new Date(startDate) && checkInDate <= new Date(endDate);
      });
    }
    
    const revenue = filteredGuests.reduce((sum, guest) => {
      return sum + (parseFloat(guest.paidAmount) || 0);
    }, 0);
    
    // Add revenue from checkouts in date range
    let checkoutRevenue = 0;
    if (startDate && endDate) {
      const checkoutActivities = activities.filter(activity => 
        activity.type === 'guest_checked_out' &&
        activity.details.checkOutDate >= startDate &&
        activity.details.checkOutDate <= endDate
      );
      
      checkoutRevenue = checkoutActivities.reduce((sum, activity) => {
        return sum + (parseFloat(activity.details.additionalPayment) || 0);
      }, 0);
    }
    
    res.json({
      totalRevenue: Math.round(revenue + checkoutRevenue),
      guestCount: filteredGuests.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
});

app.get('/api/reports/occupancy', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rooms = readJsonFile(roomsFile);
    const guests = readJsonFile(guestsFile);
    
    const totalRooms = rooms.length;
    
    // Calculate occupancy based on date range
    let occupiedRooms = new Set();
    
    if (startDate && endDate) {
      // Count rooms occupied during the date range
      guests.forEach(guest => {
        if (guest.checkInDate && guest.checkOutDate) {
          const checkIn = new Date(guest.checkInDate);
          const checkOut = new Date(guest.checkOutDate);
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          if (checkIn <= end && checkOut >= start) {
            occupiedRooms.add(guest.roomNumber);
          }
        }
      });
    } else {
      // Current occupancy
      rooms.forEach(room => {
        if (room.status === 'OCCUPIED') {
          occupiedRooms.add(room.number);
        }
      });
    }
    
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms.size / totalRooms) * 100).toFixed(1) : 0;
    
    res.json({
      totalRooms,
      occupiedRooms: occupiedRooms.size,
      occupancyRate: parseFloat(occupancyRate)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate occupancy report' });
  }
});

app.get('/api/reports/overview', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const guests = readJsonFile(guestsFile);
    const reservations = readJsonFile(reservationsFile);
    
    let filteredGuests = guests;
    let filteredReservations = reservations;
    
    if (startDate && endDate) {
      filteredGuests = guests.filter(guest => {
        const checkInDate = new Date(guest.checkInDate);
        return checkInDate >= new Date(startDate) && checkInDate <= new Date(endDate);
      });
      
      filteredReservations = reservations.filter(reservation => {
        const reservationDate = new Date(reservation.date);
        return reservationDate >= new Date(startDate) && reservationDate <= new Date(endDate);
      });
    }
    
    const totalGuests = filteredGuests.length;
    const totalBookings = filteredReservations.length;
    const cancelledBookings = filteredReservations.filter(r => r.status === 'cancelled').length;
    const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0;
    
    res.json({
      totalGuests,
      totalBookings,
      cancelledBookings,
      cancellationRate: parseFloat(cancellationRate)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate overview report' });
  }
});

app.get('/api/reports/guests', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const guests = readJsonFile(guestsFile);
    
    let filteredGuests = guests;
    if (startDate && endDate) {
      filteredGuests = guests.filter(guest => {
        const checkInDate = new Date(guest.checkInDate);
        return checkInDate >= new Date(startDate) && checkInDate <= new Date(endDate);
      });
    }
    
    res.json(filteredGuests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate guests report' });
  }
});

app.get('/api/reports/rooms', (req, res) => {
  try {
    const rooms = readJsonFile(roomsFile);
    const guests = readJsonFile(guestsFile);
    
    const roomsWithGuests = rooms.map(room => {
      const guest = guests.find(g => g.roomNumber === room.number && g.status === 'checked-in');
      return {
        ...room,
        guest: guest ? guest.primaryGuest : null,
        paidAmount: guest ? guest.paidAmount : null
      };
    });
    
    res.json(roomsWithGuests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate rooms report' });
  }
});

// Chart data endpoints
app.get('/api/reports/charts/monthly-revenue', (req, res) => {
  try {
    const guests = readJsonFile(guestsFile);
    const activities = readJsonFile(activitiesFile);
    
    const monthlyData = {};
    
    // Process check-in revenue
    guests.forEach(guest => {
      if (guest.checkInDate) {
        const month = guest.checkInDate.substring(0, 7); // YYYY-MM
        const revenue = parseFloat(guest.paidAmount) || 0;
        monthlyData[month] = (monthlyData[month] || 0) + revenue;
      }
    });
    
    // Process checkout additional payments
    activities.forEach(activity => {
      if (activity.type === 'guest_checked_out' && activity.details.checkOutDate) {
        const month = activity.details.checkOutDate.substring(0, 7);
        const additionalPayment = parseFloat(activity.details.additionalPayment) || 0;
        monthlyData[month] = (monthlyData[month] || 0) + additionalPayment;
      }
    });
    
    const chartData = Object.entries(monthlyData).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue)
    }));
    
    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate monthly revenue chart' });
  }
});

app.get('/api/reports/charts/room-types', (req, res) => {
  try {
    const rooms = readJsonFile(roomsFile);
    
    const typeCount = {};
    rooms.forEach(room => {
      typeCount[room.type] = (typeCount[room.type] || 0) + 1;
    });
    
    const chartData = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count
    }));
    
    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate room types chart' });
  }
});

app.get('/api/reports/charts/guest-sources', (req, res) => {
  try {
    const guests = readJsonFile(guestsFile);
    
    const sourceCount = {};
    guests.forEach(guest => {
      const source = guest.source || 'Direct';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });
    
    const chartData = Object.entries(sourceCount).map(([source, count]) => ({
      source,
      count
    }));
    
    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate guest sources chart' });
  }
});

// Clear all data endpoint
app.post('/api/reports/clear-data', (req, res) => {
  try {
    // Clear all data files
    writeJsonFile(guestsFile, []);
    writeJsonFile(roomsFile, []);
    writeJsonFile(reservationsFile, []);
    writeJsonFile(activitiesFile, []);
    
    // Reinitialize with default data
    // This part would require a separate function to re-add default data
    // For now, we'll just broadcast that data was cleared
    io.emit('data_cleared', { message: 'All data has been cleared' });
    
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ success: false, message: 'Failed to clear data' });
  }
});

const PORT = process.env.PORT || 3000;

// For Vercel, export the app
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
} else {
  // For local development, start the server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 