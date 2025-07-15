# Hotel Diplomat Software - Frontend

A modern React-based hotel management system for Hotel Diplomat Residency.

## 🏷️ **CURRENT VERSION: 1.0.0-ui (Stage 1 UI Complete)**

**This milestone marks the completion of Stage 1: Frontend UI Development.** The entire frontend application is now complete, tested, and ready for backend integration.

### **🎯 Milestone Achievement**
- ✅ Complete React-based hotel management frontend
- ✅ All core modules implemented and functional
- ✅ Responsive design for all devices
- ✅ Accessibility compliance (WCAG AA)
- ✅ Professional UI/UX design
- ✅ Comprehensive documentation
- ✅ Ready for backend integration

**📋 See [HDR_STAGE_1_UI_MILESTONE.md](./HDR_STAGE_1_UI_MILESTONE.md) for detailed milestone information.**

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HDRBLY/Hotel-Diplomat-Software.git
   cd Hotel-Diplomat-Software
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` and add your configuration:
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_WS_URL=ws://localhost:3001/ws
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AuthContext.tsx  # Authentication context
│   ├── Layout.tsx       # Main layout component
│   ├── Notification.tsx # Notification system
│   └── ProtectedRoute.tsx # Route protection
├── pages/              # Page components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── DeleteRooms.tsx  # Room deletion interface
│   ├── Guests.tsx       # Guest management
│   ├── Login.tsx        # Login page
│   ├── Reports.tsx      # Reports and analytics
│   ├── Reservations.tsx # Reservation management
│   ├── Rooms.tsx        # Room management
│   └── Settings.tsx     # System settings
├── services/           # API and service layer
│   └── api.ts          # API service functions
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🔧 Development Workflow

### Git Workflow

1. **Before starting work**
   ```bash
   git pull origin main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes and commit**
   ```bash
   git add .
   git commit -m "Add feature: description of changes"
   ```

4. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

### Code Standards

- Use TypeScript for all new code
- Follow ESLint rules
- Use meaningful commit messages
- Test your changes before committing

## 🔐 Authentication

The app uses JWT-based authentication. Users must log in to access protected routes.

## 📱 Features

- **Dashboard**: Overview of hotel operations
- **Room Management**: Add, edit, delete, and manage room status
- **Guest Management**: Guest registration and check-in/out
- **Reservations**: Booking management system
- **Reports**: Analytics and reporting tools
- **Settings**: System configuration

## 🌐 API Integration

The frontend communicates with a backend API. See `src/services/api.ts` for all available API endpoints.

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables for Production
Set these in your hosting platform:
- `VITE_API_BASE_URL` - Your production API URL
- `VITE_WS_URL` - Your production WebSocket URL

## 🤝 Collaboration

### For New Collaborators

1. **Fork the repository** on GitHub
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Hotel-Diplomat-Software.git
   ```
3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/HDRBLY/Hotel-Diplomat-Software.git
   ```
4. **Sync with upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Create a Pull Request
5. Wait for review and approval

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team

## 📄 License

This project is proprietary software for Hotel Diplomat Residency.

---

**Last Updated**: $(date)
**Version**: 1.0.0 