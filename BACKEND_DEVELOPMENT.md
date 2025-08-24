# Hotel Diplomat Residency - Backend Development Guide

## Overview
This document provides comprehensive guidance for developing the backend API for the Hotel Diplomat Residency management system.

## Technology Stack Recommendations

### Primary Stack (Recommended)
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.io
- **File Upload**: Multer with AWS S3
- **Email**: Nodemailer with SendGrid
- **Validation**: Joi or Zod
- **Testing**: Jest with Supertest

### Alternative Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Fastify with TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.io
- **File Upload**: Multer with Cloudinary
- **Email**: Nodemailer with SendGrid
- **Validation**: Joi or Zod
- **Testing**: Jest with Supertest

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── environment.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── roomController.ts
│   │   ├── guestController.ts
│   │   ├── reservationController.ts
│   │   ├── reportController.ts
│   │   └── settingsController.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── upload.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Room.ts
│   │   ├── Guest.ts
│   │   ├── Reservation.ts
│   │   └── RoomShift.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── rooms.ts
│   │   ├── guests.ts
│   │   ├── reservations.ts
│   │   ├── reports.ts
│   │   └── settings.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── emailService.ts
│   │   ├── notificationService.ts
│   │   └── reportService.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── helpers.ts
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts
│   └── app.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── uploads/
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

## Database Schema (PostgreSQL with Prisma)

### Core Tables

```prisma
// User Management
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String   @unique
  password  String
  name      String
  role      UserRole @default(STAFF)
  avatar    String?
  isActive  Boolean  @default(true)
  lastLogin DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  reservations Reservation[]
  roomShifts   RoomShift[]
  reports      Report[]
}

enum UserRole {
  ADMIN
  MANAGER
  STAFF
  ACCOUNTS
}

// Room Management
model Room {
  id           String     @id @default(cuid())
  number       String     @unique
  type         RoomType
  status       RoomStatus @default(AVAILABLE)
  floor        Int
  price        Decimal
  amenities    String[]   // JSON array
  category     RoomCategory
  currentGuest String?
  checkInDate  DateTime?
  checkOutDate DateTime?
  lastCleaned  DateTime   @default(now())
  notes        String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // Relations
  reservations Reservation[]
  roomShifts   RoomShift[] @relation("FromRoom")
  shiftsTo     RoomShift[] @relation("ToRoom")
}

enum RoomType {
  STANDARD
  DELUXE
  SUITE
  PRESIDENTIAL
}

enum RoomStatus {
  AVAILABLE
  OCCUPIED
  MAINTENANCE
  RESERVED
  CLEANING
}

enum RoomCategory {
  COUPLE
  CORPORATE
  SOLO
  FAMILY
}

// Guest Management
model Guest {
  id              String   @id @default(cuid())
  name            String
  email           String?
  phone           String
  address         String?
  idProof         String?
  idProofNumber   String?
  nationality     String?
  dateOfBirth     DateTime?
  gender          Gender?
  specialRequests String?
  status          GuestStatus @default(ACTIVE)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  // Relations
  reservations Reservation[]
  roomShifts   RoomShift[]
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum GuestStatus {
  ACTIVE
  INACTIVE
  BLACKLISTED
}

// Reservation Management
model Reservation {
  id             String           @id @default(cuid())
  guestId        String
  roomId         String
  userId         String
  checkInDate    DateTime
  checkOutDate   DateTime
  numberOfGuests Int              @default(1)
  status         ReservationStatus @default(PENDING)
  totalAmount    Decimal
  depositAmount  Decimal          @default(0)
  paymentMethod  PaymentMethod
  specialRequests String?
  bookingDate    DateTime         @default(now())
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  // Relations
  guest       Guest        @relation(fields: [guestId], references: [id])
  room        Room         @relation(fields: [roomId], references: [id])
  user        User         @relation(fields: [userId], references: [id])
  payments    Payment[]
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  CANCELLED
  CHECKED_IN
  CHECKED_OUT
}

enum PaymentMethod {
  CASH
  CARD
  UPI
  BANK_TRANSFER
  PENDING
}

// Room Shift Management
model RoomShift {
  id           String   @id @default(cuid())
  fromRoomId   String
  toRoomId     String
  guestId      String
  userId       String
  shiftDate    DateTime
  shiftTime    String
  reason       String
  authorizedBy String
  notes        String?
  createdAt    DateTime @default(now())

  // Relations
  fromRoom Room   @relation("FromRoom", fields: [fromRoomId], references: [id])
  toRoom   Room   @relation("ToRoom", fields: [toRoomId], references: [id])
  guest    Guest  @relation(fields: [guestId], references: [id])
  user     User   @relation(fields: [userId], references: [id])
}

// Payment Management
model Payment {
  id            String        @id @default(cuid())
  reservationId String
  amount        Decimal
  method        PaymentMethod
  status        PaymentStatus @default(PENDING)
  transactionId String?
  notes         String?
  createdAt     DateTime      @default(now())

  // Relations
  reservation Reservation @relation(fields: [reservationId], references: [id])
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// System Settings
model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value String
  type  String @default("string") // string, number, boolean, json
}
```

## API Endpoints

### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Users
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/profile
PUT    /api/users/profile
```

### Rooms
```
GET    /api/rooms
GET    /api/rooms/:id
POST   /api/rooms
PUT    /api/rooms/:id
DELETE /api/rooms/:id
PATCH  /api/rooms/:id/status
POST   /api/rooms/:id/checkout
POST   /api/rooms/:id/shift
GET    /api/rooms/shifts
```

### Guests
```
GET    /api/guests
GET    /api/guests/:id
POST   /api/guests
PUT    /api/guests/:id
DELETE /api/guests/:id
POST   /api/guests/:id/checkin
POST   /api/guests/:id/checkout
```

### Reservations
```
GET    /api/reservations
GET    /api/reservations/:id
POST   /api/reservations
PUT    /api/reservations/:id
DELETE /api/reservations/:id
PATCH  /api/reservations/:id/confirm
PATCH  /api/reservations/:id/cancel
```

### Reports
```
GET    /api/reports/dashboard
GET    /api/reports/occupancy
GET    /api/reports/revenue
GET    /api/reports/guests
POST   /api/reports/:type/export
```

### Settings
```
GET    /api/settings
PUT    /api/settings
GET    /api/settings/system-info
POST   /api/settings/backup
POST   /api/settings/restore
```

### File Upload
```
POST   /api/upload/image
POST   /api/upload/document
```

## Security Implementation

### Authentication & Authorization
```typescript
// JWT Token Structure
interface JWTPayload {
  userId: string
  username: string
  role: UserRole
  permissions: string[]
  iat: number
  exp: number
}

// Permission-based Authorization
const permissions = {
  admin: ['*'],
  manager: [
    'dashboard:view',
    'guests:view', 'guests:create', 'guests:edit', 'guests:delete',
    'rooms:view', 'rooms:create', 'rooms:edit', 'rooms:delete',
    'reservations:view', 'reservations:create', 'reservations:edit', 'reservations:delete',
    'reports:view', 'reports:export'
  ],
  staff: ['rooms:view'],
  accounts: ['reports:view']
}
```

### Rate Limiting
```typescript
// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
}
```

### Input Validation
```typescript
// Using Joi for validation
const reservationSchema = Joi.object({
  guestId: Joi.string().required(),
  roomId: Joi.string().required(),
  checkInDate: Joi.date().greater('now').required(),
  checkOutDate: Joi.date().greater(Joi.ref('checkInDate')).required(),
  numberOfGuests: Joi.number().integer().min(1).max(10).required(),
  totalAmount: Joi.number().positive().required(),
  depositAmount: Joi.number().min(0).required(),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'PENDING').required(),
  specialRequests: Joi.string().max(500).optional()
})
```

## Real-time Features

### WebSocket Events
```typescript
// Server-side events
socket.on('room_status_change', (data) => {
  // Broadcast room status change to all connected clients
  io.emit('room_updated', data)
})

socket.on('new_reservation', (data) => {
  // Broadcast new reservation to relevant users
  io.to('managers').emit('reservation_created', data)
})

socket.on('guest_checkin', (data) => {
  // Broadcast guest check-in to all staff
  io.emit('guest_checked_in', data)
})

socket.on('guest_checkout', (data) => {
  // Broadcast guest check-out to all staff
  io.emit('guest_checked_out', data)
})
```

## Email Notifications

### Email Templates
```typescript
// Email service configuration
const emailTemplates = {
  reservationConfirmation: {
    subject: 'Reservation Confirmed - Hotel Diplomat Residency',
    template: 'reservation-confirmation.html'
  },
  checkinReminder: {
    subject: 'Check-in Reminder - Hotel Diplomat Residency',
    template: 'checkin-reminder.html'
  },
  checkoutReminder: {
    subject: 'Check-out Reminder - Hotel Diplomat Residency',
    template: 'checkout-reminder.html'
  },
  passwordReset: {
    subject: 'Password Reset - Hotel Diplomat Residency',
    template: 'password-reset.html'
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// Example test structure
describe('Room Controller', () => {
  describe('GET /api/rooms', () => {
    it('should return all rooms', async () => {
      // Test implementation
    })
    
    it('should filter rooms by status', async () => {
      // Test implementation
    })
  })
})
```

### Integration Tests
```typescript
// Example integration test
describe('Reservation Flow', () => {
  it('should create reservation and update room status', async () => {
    // Test complete reservation flow
  })
})
```

## Deployment Configuration

### Docker Setup
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/hotel_diplomat"
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="24h"

# Email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"

# File Upload
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="hotel-diplomat-uploads"

# Application
NODE_ENV="production"
PORT=3001
CORS_ORIGIN="https://your-frontend-domain.com"
```

## Performance Optimization

### Database Optimization
- Implement database indexing on frequently queried fields
- Use connection pooling
- Implement query optimization
- Use database caching with Redis

### API Optimization
- Implement response caching
- Use pagination for large datasets
- Implement request compression
- Use CDN for static assets

### Security Best Practices
- Implement CORS properly
- Use HTTPS in production
- Implement request validation
- Use environment variables for sensitive data
- Implement proper error handling
- Use helmet.js for security headers

## Monitoring & Logging

### Logging Strategy
```typescript
// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})
```

### Health Checks
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Check Redis connection
    await redis.ping()
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    })
  }
})
```

## Development Workflow

### Git Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run test",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

### Code Quality
- Use ESLint for code linting
- Use Prettier for code formatting
- Implement TypeScript strict mode
- Use conventional commits

This backend development guide provides a solid foundation for building a robust, scalable, and secure hotel management system API. 