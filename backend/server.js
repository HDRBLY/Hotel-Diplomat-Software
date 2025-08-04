const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: './config.env' });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data storage (simple JSON files for now)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Initialize data files if they don't exist
const dataFiles = ['users.json', 'rooms.json', 'guests.json', 'reservations.json', 'activities.json'];
dataFiles.forEach(file => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
});

// Helper functions for data management
const readData = (filename) => {
  try {
    const data = fs.readFileSync(path.join(dataDir, filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const token = authHeader.substring(7);
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const users = readData('users.json');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

const writeData = (filename, data) => {
  try {
    fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
};

// Initialize default data if empty
const initializeDefaultData = () => {
  // Initialize users if empty
  let users = readData('users.json');
  if (users.length === 0) {
    const bcrypt = require('bcryptjs');
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const managerPassword = bcrypt.hashSync('manager123', 10);
    const staffPassword = bcrypt.hashSync('staff123', 10);
    const accountsPassword = bcrypt.hashSync('accounts123', 10);
    
    users = [
      {
        id: '1',
        username: 'admin',
        password: adminPassword,
        name: 'System Administrator',
        role: 'admin',
        email: 'admin@hoteldiplomat.com',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        username: 'manager',
        password: managerPassword,
        name: 'Hotel Manager',
        role: 'manager',
        email: 'manager@hoteldiplomat.com',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        username: 'staff',
        password: staffPassword,
        name: 'Front Desk Staff',
        role: 'staff',
        email: 'staff@hoteldiplomat.com',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '4',
        username: 'accounts',
        password: accountsPassword,
        name: 'Accounts User',
        role: 'accounts',
        email: 'accounts@hoteldiplomat.com',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    writeData('users.json', users);
  }

  // Initialize rooms if empty
  let rooms = readData('rooms.json');
  if (rooms.length === 0) {
    rooms = [
      {
        id: '1',
        number: '101',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 1,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'COUPLE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        number: '102',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 1,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        number: '103',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 1,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '4',
        number: '104',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 1,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'FAMILY',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '5',
        number: '201',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'COUPLE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '6',
        number: '202',
        type: 'SUITE',
        status: 'AVAILABLE',
        floor: 2,
        price: 4000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi'],
        category: 'COUPLE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '7',
        number: '203',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '8',
        number: '204',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '9',
        number: '206',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '10',
        number: '208',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '11',
        number: '210',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '12',
        number: '212',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '13',
        number: '214',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '14',
        number: '216',
        type: 'SUITE',
        status: 'AVAILABLE',
        floor: 2,
        price: 4000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '15',
        number: '218',
        type: 'SUITE',
        status: 'AVAILABLE',
        floor: 2,
        price: 4000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi'],
        category: 'COUPLE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '16',
        number: '219',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '17',
        number: '220',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '18',
        number: '221',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '19',
        number: '222',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '20',
        number: '223',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '21',
        number: '224',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '22',
        number: '225',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '23',
        number: '226',
        type: 'DELUXE',
        status: 'AVAILABLE',
        floor: 2,
        price: 2500,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '24',
        number: '301',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '25',
        number: '303',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '26',
        number: '304',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '27',
        number: '305',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '28',
        number: '306',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '29',
        number: '307',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '30',
        number: '308',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '31',
        number: '309',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '32',
        number: '310',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '33',
        number: '311',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '34',
        number: '312',
        type: 'STANDARD',
        status: 'AVAILABLE',
        floor: 3,
        price: 1500,
        amenities: ['AC', 'TV', 'WiFi'],
        category: 'SOLO',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '35',
        number: '401',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '36',
        number: '402',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '37',
        number: '403',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '38',
        number: '404',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '39',
        number: '405',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '40',
        number: '406',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '41',
        number: '407',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '42',
        number: '408',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '43',
        number: '409',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '44',
        number: '410',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '45',
        number: '411',
        type: 'PRESIDENTIAL',
        status: 'AVAILABLE',
        floor: 4,
        price: 8000,
        amenities: ['AC', 'TV', 'WiFi', 'Coffee', 'Balcony', 'Jacuzzi', 'Butler'],
        category: 'CORPORATE',
        currentGuest: null,
        checkInDate: null,
        checkOutDate: null,
        lastCleaned: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];
    writeData('rooms.json', rooms);
  }

  // Initialize guests if empty
  let guests = readData('guests.json');
  if (guests.length === 0) {
    guests = [];
    writeData('guests.json', guests);
  }

  // Initialize activities if empty
  let activities = readData('activities.json');
  if (activities.length === 0) {
    activities = [];
    writeData('activities.json', activities);
  }
};

// Initialize default data
initializeDefaultData();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast function for real-time updates
const broadcastUpdate = (event, data) => {
  io.emit(event, data);
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hotel Diplomat Backend is running' });
});

// Authentication routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const users = readData('users.json');
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // For demo purposes, accept any password (in production, use bcrypt.compare)
  const bcrypt = require('bcryptjs');
  const isValidPassword = bcrypt.compareSync(password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Update last login
  user.lastLogin = new Date().toISOString();
  writeData('users.json', users);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email
      }
    }
  });
});

// Token validation endpoint
app.post('/api/auth/validate', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.substring(7);
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const users = readData('users.json');
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    
    res.json({ success: true, message: 'Token is valid' });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Dashboard stats
app.get('/api/reports/dashboard', (req, res) => {
  const rooms = readData('rooms.json');
  const guests = readData('guests.json');
  const activities = readData('activities.json');
  const reservations = readData('reservations.json');

  const occupiedRooms = rooms.filter(room => room.status === 'OCCUPIED').length;
  const availableRooms = rooms.filter(room => room.status === 'AVAILABLE').length;
  const maintenanceRooms = rooms.filter(room => room.status === 'MAINTENANCE').length;
  const cleaningRooms = rooms.filter(room => room.status === 'CLEANING').length;
  const reservedRooms = rooms.filter(room => room.status === 'RESERVED').length;
  const totalRooms = rooms.length;
  
  // Calculate today's date
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate today's checkins and checkouts from activities
  let todayCheckins = 0;
  let todayCheckouts = 0;
  let todayRevenue = 0;
  
  // Count today's activities and calculate revenue from checkouts
  activities.forEach(activity => {
    try {
      // Handle both timestamp and string IDs
      let activityDate;
      if (typeof activity.id === 'number' || !isNaN(parseInt(activity.id))) {
        activityDate = new Date(parseInt(activity.id)).toISOString().split('T')[0];
      } else {
        // Skip activities without valid timestamps
        return;
      }
      
      if (activityDate === today) {
        if (activity.type === 'guest_checked_in') {
          todayCheckins++;
        } else if (activity.type === 'guest_checked_out') {
          todayCheckouts++;
          // Add revenue from checkout if there's additional payment
          if (activity.additionalPayment) {
            todayRevenue += activity.additionalPayment;
            console.log(`  + Checkout revenue: ${activity.additionalPayment}`);
          }
        }
      }
    } catch (error) {
      console.log('Skipping activity with invalid date:', activity.id);
      // Skip activities with invalid dates
    }
  });
  
  // Calculate total guests (only checked-in guests) including secondary guests and extra bed guests
  let totalGuests = 0;
  
  console.log('Dashboard calculation - Total guests found:', guests.length);
  
  guests.forEach(guest => {
    // Only count checked-in guests for total guests
    if (guest.status === 'checked-in') {
      console.log(`Guest: ${guest.name}, Status: ${guest.status}, Room: ${guest.roomNumber}`);
      
      // Count primary guest
      totalGuests += 1;
      
      // Count secondary guest if exists
      if (guest.secondaryGuest) {
        totalGuests += 1;
        console.log(`  + Secondary guest: ${guest.secondaryGuest.name}`);
      }
      
      // Count extra bed guests if exists
      if (guest.extraBeds && guest.extraBeds.length > 0) {
        totalGuests += guest.extraBeds.length;
        console.log(`  + Extra bed guests: ${guest.extraBeds.length}`);
      }
      
      // Calculate revenue from checked-in guests (use paid amount, not total amount)
      if (!guest.complimentary) {
        todayRevenue += guest.paidAmount || 0;
        console.log(`  + Revenue (paid): ${guest.paidAmount || 0}`);
      }
    }
  });
  
  // Add revenue from guests who checked out today (they paid at check-in)
  guests.forEach(guest => {
    if (guest.status === 'checked-out' && guest.checkOutDate) {
      const checkoutDate = new Date(guest.checkOutDate).toISOString().split('T')[0];
      if (checkoutDate === today && !guest.complimentary) {
        todayRevenue += guest.paidAmount || 0;
        console.log(`  + Checkout guest revenue: ${guest.paidAmount || 0} (${guest.name})`);
      }
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
  
  console.log(`Final calculation - Total guests: ${totalGuests}, Revenue: ${todayRevenue}, Today room usages: ${todayOccupiedCount}/${totalRooms}, Occupancy rate: ${occupancyRate}%`);
  console.log(`Room usage details:`, todayRoomUsage);

  res.json({
    success: true,
    data: {
      occupiedRooms,
      availableRooms,
      totalRooms,
      todayCheckins,
      todayCheckouts,
      todayRevenue,
      pendingReservations: reservations.filter(r => r.status === 'PENDING').length,
      maintenanceRooms,
      cleaningRooms,
      reservedRooms,
      totalGuests,
      occupancyRate: parseFloat(occupancyRate),
      revenue: todayRevenue
    }
  });
});

// Rooms API
app.get('/api/rooms', (req, res) => {
  const rooms = readData('rooms.json');
  
  // Convert backend format to frontend format
  const formattedRooms = rooms.map(room => ({
    ...room,
    type: room.type.toLowerCase(),
    status: room.status.toLowerCase(),
    category: room.category.toLowerCase(),
    amenities: room.amenities.map(amenity => amenity.toLowerCase())
  }));
  
  res.json({ success: true, data: formattedRooms });
});

app.post('/api/rooms', (req, res) => {
  const roomData = req.body;
  const rooms = readData('rooms.json');
  
  const newRoom = {
    id: Date.now().toString(),
    ...roomData,
    status: 'AVAILABLE',
    currentGuest: null,
    checkInDate: null,
    checkOutDate: null,
    lastCleaned: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  rooms.push(newRoom);
  writeData('rooms.json', rooms);

  // Broadcast room update
  broadcastUpdate('room_updated', newRoom);

  res.json({ success: true, data: newRoom });
});

app.put('/api/rooms/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const rooms = readData('rooms.json');
  
  const roomIndex = rooms.findIndex(room => room.id === id);
  if (roomIndex === -1) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }

  rooms[roomIndex] = { ...rooms[roomIndex], ...updateData, updatedAt: new Date().toISOString() };
  writeData('rooms.json', rooms);

  // Broadcast room update
  broadcastUpdate('room_updated', rooms[roomIndex]);

  res.json({ success: true, data: rooms[roomIndex] });
});

app.delete('/api/rooms/:id', (req, res) => {
  const { id } = req.params;
  const rooms = readData('rooms.json');
  
  const roomIndex = rooms.findIndex(room => room.id === id);
  if (roomIndex === -1) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }

  const deletedRoom = rooms.splice(roomIndex, 1)[0];
  writeData('rooms.json', rooms);

  // Broadcast room deletion
  broadcastUpdate('room_deleted', { id });

  res.json({ success: true, message: 'Room deleted successfully' });
});

// Room shift endpoint
app.post('/api/rooms/:id/shift', (req, res) => {
  const { id } = req.params;
  const shiftData = req.body;
  const rooms = readData('rooms.json');
  const guests = readData('guests.json');
  
  // Find source room
  const sourceRoomIndex = rooms.findIndex(room => room.id === id);
  if (sourceRoomIndex === -1) {
    return res.status(404).json({ success: false, message: 'Source room not found' });
  }
  
  const sourceRoom = rooms[sourceRoomIndex];
  
  // Find destination room
  const destinationRoomIndex = rooms.findIndex(room => room.number === shiftData.toRoomNumber);
  if (destinationRoomIndex === -1) {
    return res.status(404).json({ success: false, message: 'Destination room not found' });
  }
  
  const destinationRoom = rooms[destinationRoomIndex];
  
  // Validate shift
  if (sourceRoom.status !== 'OCCUPIED') {
    return res.status(400).json({ success: false, message: 'Source room is not occupied' });
  }
  
  if (destinationRoom.status !== 'AVAILABLE') {
    return res.status(400).json({ success: false, message: 'Destination room is not available' });
  }
  
  if (sourceRoom.number === destinationRoom.number) {
    return res.status(400).json({ success: false, message: 'Cannot shift to the same room' });
  }
  
  // Find guest in source room
  const guestIndex = guests.findIndex(guest => 
    guest.roomNumber === sourceRoom.number && guest.status === 'checked-in'
  );
  
  if (guestIndex === -1) {
    return res.status(404).json({ success: false, message: 'No active guest found in source room' });
  }
  
  const guest = guests[guestIndex];
  
  // Update guest room number
  guests[guestIndex].roomNumber = destinationRoom.number;
  guests[guestIndex].updatedAt = new Date().toISOString();
  
  // Update source room (clear guest info)
  rooms[sourceRoomIndex] = {
    ...sourceRoom,
    status: 'CLEANING',
    currentGuest: null,
    checkInDate: null,
    checkOutDate: null,
    notes: `Guest shifted to Room ${destinationRoom.number} on ${shiftData.shiftDate} at ${shiftData.shiftTime}. Reason: ${shiftData.reason}. Authorized by: ${shiftData.authorizedBy}. ${shiftData.notes || ''}`
  };
  
  // Update destination room (add guest info)
  rooms[destinationRoomIndex] = {
    ...destinationRoom,
    status: 'OCCUPIED',
    currentGuest: guest.name,
    checkInDate: guest.checkInDate,
    checkOutDate: guest.checkOutDate,
    category: guest.category.toUpperCase(), // Update room category to match guest category
    notes: `Guest shifted from Room ${sourceRoom.number} on ${shiftData.shiftDate} at ${shiftData.shiftTime}. Reason: ${shiftData.reason}. Authorized by: ${shiftData.authorizedBy}. ${shiftData.notes || ''}`
  };
  
  // Save changes
  writeData('rooms.json', rooms);
  writeData('guests.json', guests);
  
  // Add to activities with detailed information
  const activities = readData('activities.json');
  activities.unshift({
    id: Date.now().toString(),
    type: 'room_shift',
    guestName: guest.name,
    roomNumber: `${sourceRoom.number} → ${destinationRoom.number}`,
    time: 'Just now',
    status: 'completed',
    shiftDate: shiftData.shiftDate,
    shiftTime: shiftData.shiftTime,
    reason: shiftData.reason,
    authorizedBy: shiftData.authorizedBy,
    notes: shiftData.notes || ''
  });
  writeData('activities.json', activities);
  
  // Broadcast updates
  broadcastUpdate('room_shifted', {
    fromRoom: sourceRoom.number,
    toRoom: destinationRoom.number,
    guest: guest.name
  });
  broadcastUpdate('guest_updated', guests[guestIndex]);
  broadcastUpdate('room_updated', rooms[sourceRoomIndex]);
  broadcastUpdate('room_updated', rooms[destinationRoomIndex]);
  broadcastUpdate('activity_updated', activities[0]);
  
  res.json({ 
    success: true, 
    message: `Guest shifted from Room ${sourceRoom.number} to Room ${destinationRoom.number} successfully!`,
    data: {
      fromRoom: rooms[sourceRoomIndex],
      toRoom: rooms[destinationRoomIndex],
      guest: guests[guestIndex]
    }
  });
});

// Guests API
app.get('/api/guests', (req, res) => {
  const guests = readData('guests.json');
  res.json({ success: true, data: guests });
});

app.post('/api/guests', (req, res) => {
  const guestData = req.body;
  const guests = readData('guests.json');
  
  const newGuest = {
    id: Date.now().toString(),
    name: guestData.name,
    email: guestData.email || '',
    phone: guestData.phone,
    roomNumber: guestData.roomNumber || '',
    checkInDate: guestData.checkInDate || new Date().toISOString().split('T')[0],
    checkOutDate: guestData.checkOutDate || '',
    status: guestData.status || 'checked-in',
    totalAmount: guestData.totalAmount || 0,
    paidAmount: guestData.paidAmount || 0,
    address: guestData.address || '',
    idProof: guestData.idProof || '',
    category: guestData.category || 'couple',
    complimentary: guestData.complimentary || false,
    secondaryGuest: guestData.secondaryGuest || undefined,
    extraBeds: guestData.extraBeds || undefined,
    createdAt: new Date().toISOString()
  };

  guests.push(newGuest);
  writeData('guests.json', guests);

  // Update room status if roomNumber is provided
  if (guestData.roomNumber) {
    const rooms = readData('rooms.json');
    const roomIndex = rooms.findIndex(room => room.number === guestData.roomNumber);
    
    if (roomIndex !== -1) {
      rooms[roomIndex].status = 'OCCUPIED';
      rooms[roomIndex].currentGuest = guestData.name;
      rooms[roomIndex].checkInDate = guestData.checkInDate || new Date().toISOString();
      rooms[roomIndex].checkOutDate = guestData.checkOutDate;
      // Update room category to match guest category
      rooms[roomIndex].category = guestData.category?.toUpperCase() || 'COUPLE';
      writeData('rooms.json', rooms);
      
      // Broadcast room update with correct format
      const updatedRoom = {
        ...rooms[roomIndex],
        type: rooms[roomIndex].type.toLowerCase(),
        status: rooms[roomIndex].status.toLowerCase(),
        category: rooms[roomIndex].category.toLowerCase(),
        amenities: rooms[roomIndex].amenities.map(amenity => amenity.toLowerCase())
      };
      broadcastUpdate('room_updated', updatedRoom);
    }
  }

  // Add to activities
  const activities = readData('activities.json');
  activities.unshift({
    id: Date.now().toString(),
    type: 'guest_checked_in',
    guestName: guestData.name,
    roomNumber: guestData.roomNumber || 'N/A',
    time: 'Just now',
    status: 'completed'
  });
  writeData('activities.json', activities);

  // Broadcast guest update
  broadcastUpdate('guest_checked_in', newGuest);
  broadcastUpdate('activity_updated', activities[0]);

  res.json({ success: true, data: newGuest });
});

app.put('/api/guests/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const guests = readData('guests.json');
  
  const guestIndex = guests.findIndex(guest => guest.id === id);
  if (guestIndex === -1) {
    return res.status(404).json({ success: false, message: 'Guest not found' });
  }

  // Store old status for comparison
  const oldStatus = guests[guestIndex].status;
  
  guests[guestIndex] = { ...guests[guestIndex], ...updateData, updatedAt: new Date().toISOString() };
  writeData('guests.json', guests);

  // If guest is being checked out, update room status
  if (updateData.status === 'checked-out' && guests[guestIndex].roomNumber) {
    const rooms = readData('rooms.json');
    
    // Update current room to CLEANING (not AVAILABLE)
    const roomIndex = rooms.findIndex(room => room.number === guests[guestIndex].roomNumber);
    if (roomIndex !== -1) {
      rooms[roomIndex].status = 'CLEANING';
      rooms[roomIndex].currentGuest = null;
      rooms[roomIndex].checkInDate = null;
      rooms[roomIndex].checkOutDate = null;
      rooms[roomIndex].notes = `Guest checked out on ${new Date().toLocaleDateString()}. Room needs cleaning.`;
      // Keep the room category as is - it will be updated when a new guest checks in
      // The category should be determined by the guest, not by room type
      
      // Broadcast room update with correct format
      const updatedRoom = {
        ...rooms[roomIndex],
        type: rooms[roomIndex].type.toLowerCase(),
        status: rooms[roomIndex].status.toLowerCase(),
        category: rooms[roomIndex].category.toLowerCase(),
        amenities: rooms[roomIndex].amenities.map(amenity => amenity.toLowerCase())
      };
      broadcastUpdate('room_updated', updatedRoom);
    }
    
    // Also check for any rooms in CLEANING status that might have been left from room shifts
    // This handles the case where a guest was shifted from one room to another
    const cleaningRooms = rooms.filter(room => 
      room.status === 'CLEANING' && 
      room.notes && 
      room.notes.includes(`Guest shifted to Room ${guests[guestIndex].roomNumber}`)
    );
    
    cleaningRooms.forEach(room => {
      const roomIndex = rooms.findIndex(r => r.id === room.id);
      if (roomIndex !== -1) {
        // Keep the room in CLEANING status, just update the notes
        rooms[roomIndex].notes = `Guest was shifted from this room and later checked out on ${new Date().toLocaleDateString()}. Room needs cleaning.`;
        
        // Broadcast room update for the cleaned room
        const updatedRoom = {
          ...rooms[roomIndex],
          type: rooms[roomIndex].type.toLowerCase(),
          status: rooms[roomIndex].status.toLowerCase(),
          category: rooms[roomIndex].category.toLowerCase(),
          amenities: rooms[roomIndex].amenities.map(amenity => amenity.toLowerCase())
        };
        broadcastUpdate('room_updated', updatedRoom);
      }
    });
    
    writeData('rooms.json', rooms);
  }

  // Add to activities for checkout
  if (updateData.status === 'checked-out' && oldStatus !== 'checked-out') {
    const activities = readData('activities.json');
    
    // Calculate additional payment (final amount - original paid amount)
    const originalPaidAmount = guests[guestIndex].paidAmount || 0;
    const finalAmount = updateData.totalAmount || guests[guestIndex].totalAmount || 0;
    const additionalPayment = finalAmount - originalPaidAmount;
    
    activities.unshift({
      id: Date.now().toString(),
      type: 'guest_checked_out',
      guestName: guests[guestIndex].name || 'Unknown',
      roomNumber: guests[guestIndex].roomNumber || 'N/A',
      time: 'Just now',
      status: 'completed',
      additionalPayment: additionalPayment > 0 ? additionalPayment : 0
    });
    writeData('activities.json', activities);
    
    // Broadcast activity update and guest checkout event
    broadcastUpdate('activity_updated', activities[0]);
    broadcastUpdate('guest_checked_out', guests[guestIndex]);
  }

  // Broadcast guest update
  broadcastUpdate('guest_updated', guests[guestIndex]);

  res.json({ success: true, data: guests[guestIndex] });
});

app.delete('/api/guests/:id', (req, res) => {
  const { id } = req.params;
  const guests = readData('guests.json');
  
  const guestIndex = guests.findIndex(guest => guest.id === id);
  if (guestIndex === -1) {
    return res.status(404).json({ success: false, message: 'Guest not found' });
  }

  const deletedGuest = guests.splice(guestIndex, 1)[0];
  writeData('guests.json', guests);

  // Broadcast guest deletion
  broadcastUpdate('guest_deleted', { id });

  res.json({ success: true, message: 'Guest deleted successfully' });
});

// Reservations API
app.get('/api/reservations', (req, res) => {
  const reservations = readData('reservations.json');
  res.json({ success: true, data: reservations });
});

app.post('/api/reservations', (req, res) => {
  const reservationData = req.body;
  const reservations = readData('reservations.json');
  
  const newReservation = {
    id: Date.now().toString(),
    ...reservationData,
    status: 'PENDING',
    bookingDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  reservations.push(newReservation);
  writeData('reservations.json', reservations);

  // Add to activities
  const activities = readData('activities.json');
  activities.unshift({
    id: Date.now().toString(),
    type: 'reservation',
    guestName: reservationData.guestName || 'Unknown',
    roomNumber: reservationData.roomNumber || 'N/A',
    time: 'Just now',
    status: 'pending'
  });
  writeData('activities.json', activities);

  // Broadcast reservation update
  broadcastUpdate('reservation_created', newReservation);
  broadcastUpdate('activity_updated', activities[0]);

  res.json({ success: true, data: newReservation });
});

// Activities API
app.get('/api/activities', (req, res) => {
  const activities = readData('activities.json');
  res.json({ success: true, data: activities });
});

// Room Shifts API
app.get('/api/room-shifts', (req, res) => {
  const activities = readData('activities.json');
  const { fromDate, toDate, limit = 50 } = req.query;
  
  // Filter only room_shift activities
  let roomShifts = activities.filter(activity => activity.type === 'room_shift');
  
  // Filter by date range if provided
  if (fromDate || toDate) {
    const now = new Date();
    roomShifts = roomShifts.filter(shift => {
      const shiftTime = shift.time === 'Just now' ? now : new Date(shift.id);
      
      if (fromDate) {
        const fromDateObj = new Date(fromDate);
        if (shiftTime < fromDateObj) return false;
      }
      
      if (toDate) {
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999); // End of day
        if (shiftTime > toDateObj) return false;
      }
      
      return true;
    });
  }
  
  // Limit results
  roomShifts = roomShifts.slice(0, parseInt(limit));
  
  // Format the data for frontend
  const formattedShifts = roomShifts.map(shift => {
    const shiftTime = shift.time === 'Just now' ? new Date() : new Date(parseInt(shift.id));
    const [fromRoom, toRoom] = shift.roomNumber.split(' → ');
    
    return {
      id: shift.id,
      date: shift.shiftDate || shiftTime.toISOString().split('T')[0],
      time: shift.shiftTime || shiftTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      guest: shift.guestName,
      fromRoom: fromRoom,
      toRoom: toRoom,
      reason: shift.reason || 'Room Shift',
      authorizedBy: shift.authorizedBy || 'System',
      notes: shift.notes || ''
    };
  });
  
  res.json({ success: true, data: formattedShifts });
});

// Reports API
app.get('/api/reports/revenue', (req, res) => {
  const { startDate, endDate } = req.query;
  const guests = readData('guests.json');
  const activities = readData('activities.json');
  
  // Generate revenue data based on actual guest payments
  const revenueData = [];
  const today = new Date();
  
  // Generate last 7 days of data
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Calculate revenue from guests who checked in on this date (using paid amount)
    const dayCheckins = guests.filter(guest => 
      guest.checkInDate === dateStr && guest.status === 'checked-in'
    );
    const checkinRevenue = dayCheckins.reduce((sum, guest) => sum + (guest.paidAmount || 0), 0);
    
    // Calculate revenue from checkouts on this date (additional payments)
    const dayCheckouts = activities.filter(activity => {
      if (activity.type !== 'guest_checked_out') return false;
      try {
        const activityDate = new Date(parseInt(activity.id)).toISOString().split('T')[0];
        return activityDate === dateStr;
      } catch (error) {
        return false;
      }
    });
    const checkoutRevenue = dayCheckouts.reduce((sum, activity) => sum + (activity.additionalPayment || 0), 0);
    
    const totalDayRevenue = checkinRevenue + checkoutRevenue;
    const bookings = dayCheckins.length;
    const averageRate = bookings > 0 ? Math.round(totalDayRevenue / bookings) : 0;
    
    revenueData.push({
      date: dateStr,
      revenue: totalDayRevenue,
      bookings: bookings,
      averageRate: averageRate,
      checkinRevenue: checkinRevenue,
      checkoutRevenue: checkoutRevenue
    });
  }
  
  // Filter by date range if provided
  let filteredData = revenueData;
  if (startDate && endDate) {
    filteredData = revenueData.filter(item => {
      const itemDate = new Date(item.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return itemDate >= start && itemDate <= end;
    });
  }
  
  res.json({ success: true, data: filteredData });
});

app.get('/api/reports/occupancy', (req, res) => {
  const rooms = readData('rooms.json');
  const guests = readData('guests.json');
  const today = new Date();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate today's occupancy rate using room usage frequency (same as dashboard)
  let todayOccupiedRooms = new Set();
  
  // Add currently occupied rooms
  rooms.forEach(room => {
    if (room.status === 'OCCUPIED') {
      todayOccupiedRooms.add(room.number);
    }
  });
  
  // Add rooms that were checked out today
  guests.forEach(guest => {
    if (guest.status === 'checked-out' && guest.checkOutDate) {
      const checkoutDate = new Date(guest.checkOutDate).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (checkoutDate === todayStr && guest.roomNumber) {
        todayOccupiedRooms.add(guest.roomNumber);
      }
    }
  });
  
  const todayOccupiedCount = todayOccupiedRooms.size;
  const totalRooms = rooms.length;
  const todayRate = totalRooms > 0 ? Math.round((todayOccupiedCount / totalRooms) * 100 * 10) / 10 : 0;
  
  const occupancyData = daysOfWeek.map((day, index) => {
    // For today, use the calculated rate, for other days use a base rate
    const rate = index === today.getDay() ? todayRate : Math.round(todayRate * 0.8); // 80% of today's rate for other days
    
    return {
      day: day,
      rate: rate,
      availableRooms: totalRooms - (index === today.getDay() ? todayOccupiedCount : Math.round(todayOccupiedCount * 0.8)),
      totalRooms: totalRooms,
      occupiedRooms: index === today.getDay() ? todayOccupiedCount : Math.round(todayOccupiedCount * 0.8),
      todayOccupiedRooms: index === today.getDay() ? todayOccupiedCount : 0
    };
  });
  
  res.json({ success: true, data: occupancyData });
});

app.get('/api/reports/guests', (req, res) => {
  const { startDate, endDate } = req.query;
  const guests = readData('guests.json');
  
  let filteredGuests = guests;
  
  // Filter guests by date range if provided
  if (startDate && endDate) {
    filteredGuests = guests.filter(guest => {
      const checkInDate = guest.checkInDate;
      return checkInDate && checkInDate >= startDate && checkInDate <= endDate;
    });
  }
  
  const guestData = filteredGuests.map(guest => ({
    name: guest.name,
    roomNumber: guest.roomNumber || 'N/A',
    checkInDate: guest.checkInDate || 'N/A',
    checkOutDate: guest.checkOutDate || 'N/A',
    status: guest.status === 'checked-in' ? 'Checked-in' : 
            guest.status === 'checked-out' ? 'Checked-out' : 'Reserved',
    amount: guest.paidAmount || 0
  }));
  
  res.json({ success: true, data: guestData });
});

app.get('/api/reports/rooms', (req, res) => {
  const rooms = readData('rooms.json');
  const guests = readData('guests.json');
  
  const roomData = rooms.map(room => {
    // Calculate revenue for this room using paid amounts
    const roomGuests = guests.filter(guest => 
      guest.roomNumber === room.number && guest.status === 'checked-in'
    );
    const revenue = roomGuests.reduce((sum, guest) => sum + (guest.paidAmount || 0), 0);
    
    return {
      number: room.number,
      type: room.type?.toLowerCase() || 'standard',
      status: room.status === 'OCCUPIED' ? 'Occupied' : 
              room.status === 'AVAILABLE' ? 'Available' : 
              room.status === 'MAINTENANCE' ? 'Maintenance' : 
              room.status === 'CLEANING' ? 'Cleaning' : 'Available',
      lastCleaned: room.lastCleaned ? new Date(room.lastCleaned).toISOString().split('T')[0] : 'N/A',
      revenue: revenue,
      category: room.category?.toLowerCase() || 'standard'
    };
  });
  
  res.json({ success: true, data: roomData });
});

app.get('/api/reports/overview', (req, res) => {
  const { startDate, endDate } = req.query;
  const rooms = readData('rooms.json');
  const guests = readData('guests.json');
  const activities = readData('activities.json');
  
  // Determine date range for calculations
  const today = new Date().toISOString().split('T')[0];
  const start = startDate || today;
  const end = endDate || today;
  
  // Calculate occupancy rate using room usage frequency for the date range
  let occupiedRooms = new Set();
  
  // Add currently occupied rooms
  rooms.forEach(room => {
    if (room.status === 'OCCUPIED') {
      occupiedRooms.add(room.number);
    }
  });
  
  // Add rooms that were checked out in the date range
  guests.forEach(guest => {
    if (guest.status === 'checked-out' && guest.checkOutDate) {
      const checkoutDate = new Date(guest.checkOutDate).toISOString().split('T')[0];
      if (checkoutDate >= start && checkoutDate <= end && guest.roomNumber) {
        occupiedRooms.add(guest.roomNumber);
      }
    }
  });
  
  const occupiedCount = occupiedRooms.size;
  const totalRooms = rooms.length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100 * 10) / 10 : 0;
  
  // Calculate total revenue using paid amounts for the date range
  let totalRevenue = 0;
  
  // Revenue from guests who checked in during the date range
  guests.forEach(guest => {
    if (guest.checkInDate && guest.checkInDate >= start && guest.checkInDate <= end && !guest.complimentary) {
      totalRevenue += guest.paidAmount || 0;
    }
  });
  
  // Revenue from checkout activities (additional payments) in the date range
  activities.forEach(activity => {
    try {
      if (activity.type === 'guest_checked_out' && activity.additionalPayment) {
        const activityDate = new Date(parseInt(activity.id)).toISOString().split('T')[0];
        if (activityDate >= start && activityDate <= end) {
          totalRevenue += activity.additionalPayment;
        }
      }
    } catch (error) {
      // Skip activities with invalid dates
    }
  });
  
  // Calculate total guests for the date range (including secondary and extra bed guests)
  let totalGuests = 0;
  guests.forEach(guest => {
    if (guest.checkInDate && guest.checkInDate >= start && guest.checkInDate <= end) {
      totalGuests += 1; // Primary guest
      if (guest.secondaryGuest) {
        totalGuests += 1; // Secondary guest
      }
      if (guest.extraBeds && guest.extraBeds.length > 0) {
        totalGuests += guest.extraBeds.length; // Extra bed guests
      }
    }
  });
  
  // Calculate total bookings for the date range
  const totalBookings = guests.filter(guest => 
    guest.checkInDate && guest.checkInDate >= start && guest.checkInDate <= end
  ).length;
  
  const averageRoomRate = totalGuests > 0 ? Math.round(totalRevenue / totalGuests) : 0;
  
  // Calculate cancellation rate based on actual data for the date range
  const totalCheckins = activities.filter(activity => {
    if (activity.type !== 'guest_checked_in') return false;
    try {
      const activityDate = new Date(parseInt(activity.id)).toISOString().split('T')[0];
      return activityDate >= start && activityDate <= end;
    } catch (error) {
      return false;
    }
  }).length;
  
  const totalCheckouts = activities.filter(activity => {
    if (activity.type !== 'guest_checked_out') return false;
    try {
      const activityDate = new Date(parseInt(activity.id)).toISOString().split('T')[0];
      return activityDate >= start && activityDate <= end;
    } catch (error) {
      return false;
    }
  }).length;
  
  const cancellationRate = totalCheckins > 0 ? Math.round(((totalCheckins - totalCheckouts) / totalCheckins) * 100 * 10) / 10 : 0;
  
  res.json({
    success: true,
    data: {
      occupancyRate,
      totalRevenue,
      averageRoomRate,
      totalGuests,
      totalBookings,
      cancellationRate
    }
  });
});

// Clear all data endpoint
app.post('/api/reports/clear-data', (req, res) => {
  try {
    // Clear all data files
    writeData('guests.json', []);
    writeData('rooms.json', []);
    writeData('reservations.json', []);
    writeData('activities.json', []);
    
    // Reinitialize with default data
    initializeDefaultData();
    
    // Broadcast data cleared event
    broadcastUpdate('data_cleared', { message: 'All data has been cleared' });
    
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ success: false, message: 'Failed to clear data' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Hotel Diplomat Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
  console.log(`🌐 API available at http://localhost:${PORT}/api`);
}); 