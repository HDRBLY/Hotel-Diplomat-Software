# Hotel Diplomat Residency (HDR) Management System

A comprehensive hotel management system built with React, TypeScript, and Node.js for Hotel Diplomat Residency.

## 🚀 Quick Start

### Option 1: Using the Start Script (Recommended)
```bash
# Windows
start.bat

# Linux/Mac
./start.sh
```

### Option 2: Manual Start
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Start backend server
cd backend && npm start

# In a new terminal, start frontend
npm run dev
```

## 🔐 Security Features

- **Secure Authentication**: Proper bcrypt password hashing
- **JWT Token Management**: Secure session handling with automatic cleanup
- **Role-based Access Control**: Granular permissions for different user roles
- **Input Validation**: Comprehensive validation for all user inputs
- **Error Boundaries**: Graceful error handling throughout the application

## 🛠️ Recent Improvements

### Critical Security Fixes
- ✅ Removed hardcoded passwords from frontend and backend
- ✅ Implemented proper bcrypt password hashing
- ✅ Fixed logout function to properly clear authentication tokens
- ✅ Added proper error handling for all API calls

### Enhanced User Experience
- ✅ Added loading states for all data fetching operations
- ✅ Implemented proper error handling with user-friendly messages
- ✅ Added React Error Boundaries for graceful error recovery
- ✅ Improved WebSocket connection management to prevent memory leaks

### Performance Improvements
- ✅ Optimized API calls with proper timeout handling
- ✅ Added proper cleanup for WebSocket connections
- ✅ Implemented fallback data when API is unavailable

## 📋 Demo Credentials

| Role | Username | Password | Permissions |
|------|----------|----------|-------------|
| Admin | admin | admin123 | Full access to all features |
| Manager | manager | manager123 | Management features (no settings) |
| Staff | staff | staff123 | Limited access (rooms view only) |
| Accounts | accounts | accounts123 | Reports only |

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

## 🔧 Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001/ws
```

## 📁 Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Main application pages
│   ├── services/      # API and utility services
│   └── App.tsx        # Main application component
├── backend/
│   ├── server.js      # Express server
│   ├── data/          # JSON data storage
│   └── config.env     # Backend configuration
└── README.md
```

## 🚨 Error Handling

The application now includes comprehensive error handling:

- **Network Errors**: Graceful fallback to mock data
- **Authentication Errors**: Automatic redirect to login
- **Component Errors**: Error boundaries prevent app crashes
- **API Timeouts**: Proper timeout handling with user feedback

## 🔄 Real-time Updates

- WebSocket connections for live data updates
- Proper connection cleanup to prevent memory leaks
- Automatic reconnection handling

## 📱 Responsive Design

- Mobile-friendly interface
- Responsive grid layouts
- Touch-friendly controls

## 🛡️ Security Best Practices

- No hardcoded credentials in production code
- Proper session management
- Input sanitization and validation
- Role-based access control
- Secure password storage with bcrypt

## 🐛 Bug Fixes

### Critical Issues Resolved
1. **Authentication Token Persistence**: Fixed logout to properly clear tokens
2. **Hardcoded Passwords**: Removed from both frontend and backend
3. **Memory Leaks**: Fixed WebSocket connection cleanup
4. **Error Handling**: Added comprehensive error handling throughout
5. **Loading States**: Added proper loading indicators

### Performance Improvements
1. **API Reliability**: Added timeout handling and fallback data
2. **Error Recovery**: Implemented error boundaries for graceful recovery
3. **Connection Management**: Proper WebSocket lifecycle management

## 📞 Support

For technical support or questions, please refer to the documentation or contact the development team.

---

**Note**: This is a production-ready hotel management system with enhanced security and error handling. All critical bugs have been resolved while maintaining full functionality and user experience. 