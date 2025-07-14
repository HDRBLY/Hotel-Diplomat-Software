# Hotel Diplomat Residency (HDR) - Front Desk Management System

A modern, comprehensive hotel management system built with React, TypeScript, and Tailwind CSS. This application provides a complete solution for managing Hotel Diplomat Residency (HDR) front desk operations including guest management, room bookings, reservations, and detailed analytics.

## 🏨 Features

### 📊 Dashboard
- Real-time hotel statistics and metrics
- Occupancy rate tracking
- Revenue analytics with interactive charts
- Recent activity feed
- Quick access to key functions

### 👥 Guest Management
- Complete guest information management
- Check-in and check-out processing
- Guest search and filtering
- Payment tracking and status management
- Guest history and preferences

### 🏠 Room Management
- Room status tracking (Available, Occupied, Maintenance, Reserved)
- Room type management (Standard, Deluxe, Suite, Presidential)
- Amenities and pricing configuration
- Room cleaning status
- Maintenance tracking

### 📅 Reservation System
- Booking management and confirmation
- Reservation status tracking
- Guest communication
- Payment processing
- Cancellation handling

### 📈 Reports & Analytics
- Revenue trend analysis
- Occupancy reports
- Guest source tracking
- Performance metrics
- Exportable reports

### ⚙️ Settings & Configuration
- Hotel information management
- User access control
- System preferences
- Security settings
- Billing configuration

## 🚀 Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Build Tool**: Vite
- **Routing**: React Router DOM

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel-diplomat-residency-software
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Layout.tsx      # Main layout with navigation
├── pages/              # Application pages
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Guests.tsx      # Guest management
│   ├── Rooms.tsx       # Room management
│   ├── Reservations.tsx # Reservation system
│   ├── Reports.tsx     # Analytics and reports
│   └── Settings.tsx    # System configuration
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## 🎨 Design System

The application uses a consistent design system with:

- **Color Palette**: Professional blue and gray tones
- **Typography**: Inter font family
- **Components**: Reusable card, button, and form components
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliant design

## 🔧 Configuration

### Hotel Information
Update hotel details in the Settings page:
- Hotel name and contact information
- Address and website
- Operating hours
- Tax rates and policies

### Room Types
Configure room categories and pricing:
- Standard rooms
- Deluxe rooms
- Suites
- Presidential suites

### User Roles
Manage staff access with different permission levels:
- **Admin**: Full system access
- **Manager**: Operational management
- **Staff**: Front desk operations

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Touch-screen kiosks

## 🔒 Security Features

- User authentication and authorization
- Role-based access control
- Session management
- Secure data handling
- Audit logging

## 📊 Data Management

Currently using mock data for demonstration. In production, integrate with:
- Database (PostgreSQL, MySQL)
- API endpoints
- Real-time updates
- Data backup and recovery

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy Options
- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect your repository
- **AWS S3**: Upload static files
- **Traditional hosting**: Upload to web server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- **Mobile App**: Native iOS and Android applications
- **API Integration**: Connect with booking platforms
- **Payment Gateway**: Integrated payment processing
- **Multi-language**: Internationalization support
- **Advanced Analytics**: AI-powered insights
- **Housekeeping Module**: Staff management
- **Inventory Management**: Supplies and amenities tracking

---

**Hotel Diplomat Residency (HDR) Management System** - Streamlining hotel operations with modern technology. 