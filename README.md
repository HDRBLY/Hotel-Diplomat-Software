# Hotel Diplomat Software - Enhanced Frontend

A modern, high-performance React-based hotel management system for Hotel Diplomat Residency with enhanced code quality, performance optimizations, and professional development practices.

## 🏷️ **CURRENT VERSION: 1.1.0-enhanced (Professional Edition)**

**This version includes comprehensive improvements:**
- ✅ Enhanced code quality and TypeScript strict mode
- ✅ Performance optimizations with lazy loading and memoization
- ✅ Professional error handling and error boundaries
- ✅ Advanced notification system with stacking
- ✅ Improved authentication with token management
- ✅ Better accessibility and responsive design
- ✅ Comprehensive utility functions and type safety
- ✅ Modern development practices and best practices

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
   Navigate to `http://localhost:3000`

## 🛠️ Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production with optimizations
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality
- `npm run type-check` - Run TypeScript type checking

## 📁 Enhanced Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AuthContext.tsx  # Enhanced authentication context
│   ├── ErrorBoundary.tsx # Error boundary for graceful error handling
│   ├── Layout.tsx       # Main layout component
│   ├── Loading.tsx      # Comprehensive loading components
│   ├── Notification.tsx # Advanced notification system
│   └── ProtectedRoute.tsx # Route protection with permissions
├── pages/              # Page components (lazy loaded)
│   ├── Dashboard.tsx    # Main dashboard
│   ├── DeleteRooms.tsx  # Room deletion interface
│   ├── Guests.tsx       # Guest management
│   ├── Login.tsx        # Login page
│   ├── Reports.tsx      # Reports and analytics
│   ├── Reservations.tsx # Reservation management
│   ├── Rooms.tsx        # Room management
│   └── Settings.tsx     # System settings
├── services/           # API and service layer
│   └── api.ts          # Enhanced API service functions
├── types/              # TypeScript type definitions
│   └── index.ts        # Comprehensive type definitions
├── utils/              # Utility functions
│   └── index.ts        # Common utility functions
├── App.tsx             # Enhanced main app component
├── main.tsx            # App entry point
└── index.css           # Global styles with design system
```

## 🔧 Enhanced Features

### **Performance Optimizations**
- **Lazy Loading**: All pages are lazy loaded for faster initial load
- **Code Splitting**: Automatic code splitting with Vite
- **Memoization**: React.memo, useMemo, and useCallback for performance
- **Bundle Optimization**: Manual chunk splitting for better caching

### **Code Quality Improvements**
- **TypeScript Strict Mode**: Enhanced type safety
- **Error Boundaries**: Graceful error handling throughout the app
- **Consistent Code Style**: ESLint and Prettier configuration
- **Path Aliases**: Clean import paths with TypeScript path mapping

### **Enhanced Authentication**
- **Token Management**: JWT-like token system with expiration
- **Permission System**: Role-based access control
- **Session Persistence**: Secure localStorage with token validation
- **Loading States**: Proper loading indicators during auth operations

### **Advanced Notification System**
- **Multiple Notifications**: Stack multiple notifications
- **Persistent Notifications**: Notifications that don't auto-dismiss
- **Accessibility**: ARIA labels and keyboard navigation
- **Customizable**: Different types, durations, and styles

### **Loading Components**
- **Multiple Variants**: Spinner, dots, pulse, skeleton
- **Loading Overlays**: Overlay loading for components
- **Loading Buttons**: Buttons with loading states
- **Responsive**: Different sizes for different contexts

### **Utility Functions**
- **Formatting**: Currency, dates, relative time
- **Validation**: Email, phone, form validation
- **Performance**: Debounce, throttle, retry functions
- **Helpers**: Deep clone, ID generation, text utilities

## 🔐 Authentication & Authorization

### **User Roles**
- **Admin**: Full system access
- **Manager**: Hotel management operations
- **Staff**: Front desk operations
- **Accounts**: Financial reports and billing

### **Default Credentials**
```
Admin:     admin / admin123
Manager:   manager / manager123
Staff:     staff / staff123
Accounts:  accounts / accounts123
```

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop**: Full feature set with sidebar navigation
- **Tablet**: Adaptive layout with touch-friendly controls
- **Mobile**: Mobile-optimized interface with bottom navigation

## 🌐 API Integration

The frontend communicates with a backend API through the enhanced service layer:
- **Error Handling**: Comprehensive error handling and retry logic
- **Request Interceptors**: Automatic token management
- **Response Validation**: Type-safe API responses
- **WebSocket Support**: Real-time updates (when backend is available)

## 🚀 Deployment

### **Production Build**
```bash
npm run build
```

### **Environment Variables for Production**
Set these in your hosting platform:
- `VITE_API_BASE_URL` - Your production API URL
- `VITE_WS_URL` - Your production WebSocket URL

### **Build Optimizations**
- **Tree Shaking**: Unused code elimination
- **Minification**: Terser minification for smaller bundles
- **Source Maps**: Development debugging support
- **Asset Optimization**: Automatic image and font optimization

## 🤝 Development Guidelines

### **Code Standards**
- Use TypeScript for all new code
- Follow ESLint rules and Prettier formatting
- Use meaningful commit messages
- Test your changes before committing
- Use the provided utility functions

### **Performance Best Practices**
- Use React.memo for expensive components
- Implement proper loading states
- Optimize images and assets
- Use lazy loading for large components
- Monitor bundle size

### **Accessibility**
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Maintain proper color contrast
- Test with screen readers
- Follow WCAG guidelines

## 🔧 Development Workflow

### **Git Workflow**

1. **Before starting work**
   ```bash
   git pull origin main
   npm install
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

### **Commit Message Convention**
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes

## 📞 Support & Troubleshooting

### **Common Issues**

1. **Port 3000 already in use**
   ```bash
   # Kill the process using port 3000
   npx kill-port 3000
   # Or use a different port
   npm run dev -- --port 3001
   ```

2. **TypeScript errors**
   ```bash
   npm run type-check
   # Fix any type errors before proceeding
   ```

3. **Build errors**
   ```bash
   npm run build
   # Check the console for specific error messages
   ```

### **Getting Help**
- Create an issue on GitHub
- Contact the development team
- Check the documentation in `/docs` folder

## 📄 License

This project is proprietary software for Hotel Diplomat Residency.

---

**Last Updated**: December 2024
**Version**: 1.1.0-enhanced
**Node.js**: v16+
**React**: v18.2.0
**TypeScript**: v4.9.3 