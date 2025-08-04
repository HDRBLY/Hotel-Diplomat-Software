const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '../dist')));

// Load data files
const loadData = (filename) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return [];
  }
};

const saveData = (filename, data) => {
  try {
    fs.writeFileSync(path.join(__dirname, 'data', filename), JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving ${filename}:`, error);
    return false;
  }
};

// API Routes
app.get('/api/rooms', (req, res) => {
  const rooms = loadData('rooms.json');
  res.json(rooms);
});

app.post('/api/rooms', (req, res) => {
  const rooms = loadData('rooms.json');
  const newRoom = { ...req.body, id: Date.now().toString() };
  rooms.push(newRoom);
  if (saveData('rooms.json', rooms)) {
    io.emit('room_added', newRoom);
    res.json(newRoom);
  } else {
    res.status(500).json({ error: 'Failed to save room' });
  }
});

app.put('/api/rooms/:id', (req, res) => {
  const rooms = loadData('rooms.json');
  const index = rooms.findIndex(room => room.id === req.params.id);
  if (index !== -1) {
    rooms[index] = { ...rooms[index], ...req.body };
    if (saveData('rooms.json', rooms)) {
      io.emit('room_updated', rooms[index]);
      res.json(rooms[index]);
    } else {
      res.status(500).json({ error: 'Failed to update room' });
    }
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

app.delete('/api/rooms/:id', (req, res) => {
  const rooms = loadData('rooms.json');
  const filteredRooms = rooms.filter(room => room.id !== req.params.id);
  if (saveData('rooms.json', filteredRooms)) {
    io.emit('room_deleted', req.params.id);
    res.json({ message: 'Room deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Guest routes
app.get('/api/guests', (req, res) => {
  const guests = loadData('guests.json');
  res.json(guests);
});

app.post('/api/guests', (req, res) => {
  const guests = loadData('guests.json');
  const newGuest = { ...req.body, id: Date.now().toString() };
  guests.push(newGuest);
  if (saveData('guests.json', guests)) {
    io.emit('guest_added', newGuest);
    res.json(newGuest);
  } else {
    res.status(500).json({ error: 'Failed to save guest' });
  }
});

app.put('/api/guests/:id', (req, res) => {
  const guests = loadData('guests.json');
  const index = guests.findIndex(guest => guest.id === req.params.id);
  if (index !== -1) {
    guests[index] = { ...guests[index], ...req.body };
    if (saveData('guests.json', guests)) {
      io.emit('guest_updated', guests[index]);
      res.json(guests[index]);
    } else {
      res.status(500).json({ error: 'Failed to update guest' });
    }
  } else {
    res.status(404).json({ error: 'Guest not found' });
  }
});

// User authentication
app.post('/api/auth/login', (req, res) => {
  const users = loadData('users.json');
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      } 
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Reports API
app.get('/api/reports/dashboard', (req, res) => {
  const rooms = loadData('rooms.json');
  const guests = loadData('guests.json');
  const activities = loadData('activities.json');
  
    const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(room => room.status === 'OCCUPIED').length;
  const totalGuests = guests.filter(guest => guest.status === 'checked-in').length;
  
  // Calculate today's revenue
  const today = new Date().toISOString().split('T')[0];
  const todayRevenue = guests
    .filter(guest => guest.status === 'checked-in')
    .reduce((sum, guest) => sum + (guest.paidAmount || 0), 0);
  
  // Calculate occupancy rate
  const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;
  
  res.json({
    totalRooms,
    occupiedRooms,
    totalGuests,
    todayRevenue,
      occupancyRate,
    recentActivities: activities.slice(-5)
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend will be served from: ${path.join(__dirname, '../dist')}`);
}); 