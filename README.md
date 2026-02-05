# Cliniqo 🏥

**One place solution** - A comprehensive medical appointment booking and clinic management system built with Node.js, Express, and SQLite.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production--ready-success)](https://github.com)

## 📋 Overview

DoctorPod is a full-stack healthcare management platform that streamlines patient appointments, doctor consultations, prescription management, and clinic operations. It features multi-role dashboards, real-time queue management, PDF prescription generation, WhatsApp integration, and email OTP-based password recovery.

**Live Demo**: [doctorpod.onrender.com](https://doctorpod.onrender.com) (if deployed)

## ✨ Features

### 🎨 Professional UI/UX
- Modern, calm blue-cyan-green healthcare color palette
- Eye-friendly professional design optimized for long hours
- Fully responsive mobile-first interface
- High contrast for excellent readability

### 👨‍⚕️ Doctor Dashboard
- View daily patient queue with real-time status updates
- Digital prescription writing with medicine autocomplete
- Patient visit history lookup with instant search
- PDF prescription generation with clinic branding
- WhatsApp prescription sharing
- Diagnosis and medicine management
- **OTP-based password recovery** (dual mode: console + email)

### 🏥 Clinic Dashboard
- Manage clinic details and timings
- Configure availability slots
- View and manage doctor assignments
- Track daily appointments and analytics
- **30-day free trial** for new signups
- **OTP-based password recovery** system

### 👤 Patient Portal
- Easy appointment booking
- Clinic and doctor search
- Booking verification via mobile number
- Digital prescription access

### 🔧 Admin Panel
- System-wide management
- Multi-clinic oversight
- User and access management
- Analytics and reporting

### 🔐 Security Features
- **Email OTP verification** for password resets (Gmail SMTP)
- **Dual OTP mode**: Console logging (dev) + Email sending (production)
- Session-based authentication with role-specific access
- Encrypted sensitive data storage
- HIPAA-ready security practices

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js + Express.js |
| **Database** | SQLite (better-sqlite3) |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **PDF Generation** | PDFKit |
| **QR Codes** | qrcode library |
| **Email Service** | Nodemailer (Gmail SMTP) |
| **AI Agent** | Python (Gemini API) |
| **Deployment** | Render.com (production-ready) |

### Key Dependencies
- `express` - Web framework
- `better-sqlite3` - Fast SQLite database
- `express-session` - Session management
- `nodemailer` - Email OTP delivery
- `pdfkit` - PDF prescription generation
- `dotenv` - Environment configuration
- `multer` - File upload handling
- `qrcode` - QR code generation

## 📁 Project Structure

```
doctorpod/
├── server.js                 # Production entry point (Render-ready)
├── app.js                    # Express app configuration
├── initDatabase.js           # Database initialization script
├── initAssistantAccessIds.js # Access ID setup
├── package.json
├── .env                      # Environment variables (not in git)
│
├── database/
│   ├── doctorpod.db          # SQLite database file (ephemeral on Render)
│   ├── schema.sql            # Complete database schema
│   └── sample_data.sql       # Sample data (auto-loaded on first deploy)
│
├── src/
│   ├── controllers/          # Route handlers
│   │   ├── adminController.js
│   │   ├── analyticsController.js
│   │   ├── availabilityController.js
│   │   ├── bookingController.js
│   │   ├── clinicController.js      # OTP password reset
│   │   ├── doctorController.js      # OTP password reset
│   │   ├── followUpController.js
│   │   ├── historyController.js
│   │   ├── medicineController.js
│   │   ├── patientController.js
│   │   ├── payController.js
│   │   ├── pdfController.js
│   │   ├── updateHistoryController.js
│   │   └── whatsappController.js
│   │
│   ├── routes/               # Express route definitions
│   │   └── [matching route files]
│   │
│   └── utils/                # Utility functions
│       ├── db.js             # Database connection
│       ├── dbHelper.js       # Query helpers
│       ├── fileHelper.js     # File operations
│       ├── googleDriveHelper.js # Google Drive integration
│       ├── idGenerator.js    # Unique ID generation
│       ├── notificationHelper.js # Email/SMS helpers
│       └── slotGenerator.js  # Time slot generation
│
├── public/                   # Frontend static files
│   ├── index.html            # Landing page (professional design)
│   ├── patient_booking.html  # Patient booking interface
│   ├── check_booking.html    # Booking verification
│   ├── doctor_login.html     # Doctor auth + OTP recovery
│   ├── doctor_dashboard.html # Doctor consultation UI
│   ├── doctor_home.html      # Doctor portal home
│   ├── clinic_login.html     # Clinic auth + OTP recovery
│   ├── clinic_dashboard.html # Clinic management UI
│   ├── clinic_home.html      # Clinic portal home
│   ├── admin_login.html      # Admin authentication
│   ├── admin_dashboard.html  # System admin UI
│   ├── provider_portal.html  # Provider access portal
│   ├── pay_redirect.html     # Payment redirection
│   │
│   ├── css/
│   │   └── styles.css        # Global styles
│   │
│   ├── js/                   # Frontend JavaScript
│   │   ├── app.js
│   │   ├── main.js
│   │   ├── doctorDashboard.js
│   │   ├── doctorLogin.js
│   │   ├── doctor.js
│   │   ├── clinicDashboard.js
│   │   ├── clinicLogin.js
│   │   ├── adminDashboard.js
│   │   ├── adminLogin.js
│   │   └── checkBooking.js
│   │
│   ├── asset/                # Static assets
│   │   ├── logo/             # Clinic logos
│   │   └── QR/               # Generated QR codes
│   │
│   └── pdfs/                 # Generated prescriptions
│
├── genai_agent/              # AI-powered agents (Python)
│   ├── agent.py
│   ├── call_agent.py
│   ├── call_utils.py
│   ├── message_agent.py
│   ├── message_utils.py
│   ├── whatsapp_agent.py
│   ├── whatsapp_utils.py
│   ├── requirements.txt
│   └── README.md
│
└── views/
    └── partials/             # Reusable view components
```

## 🗄️ Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `admins` | System administrators |
| `clinics` | Clinic information and settings |
| `doctors` | Doctor profiles linked to clinics |
| `patients` | Patient records |
| `availability_slots` | Doctor schedule configuration |
| `bookings` | Appointment bookings |
| `visits` | Consultation records |
| `prescription_items` | Prescribed medicines per visit |
| `medicines` | Medicine master list |
| `diagnoses` | Diagnosis master list |

### Supporting Tables

| Table | Description |
|-------|-------------|
| `audit_logs` | System activity tracking |
| `feedbacks` | Patient feedback and ratings |
| `daily_analytics` | Aggregated daily statistics |
| `notifications` | Patient/doctor notifications |
| `follow_ups` | Scheduled follow-up reminders |
| `system_settings` | Global configuration |

### Key Views

- `v_booking_details` - Complete booking information with patient/doctor/clinic details
- `v_visit_details` - Visit records with all related data
- `v_doctor_schedule` - Doctor availability overview
- `v_daily_summary` - Daily clinic statistics

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (tested on v24.12.0)
- **npm** 10+
- **Python** 3.9+ (for AI agents, optional)
- **Gmail account** (for email OTP, optional)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd doctorpod
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   If you encounter `better-sqlite3` errors on Node.js 24+:
   ```bash
   npm rebuild better-sqlite3
   ```

3. **Configure environment**
   
   Create `.env` file:
   ```env
   # Base URL - REQUIRED for production QR codes
   BASE_URL=http://localhost:3000
   
   # Email configuration (for email OTP, optional)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password
   
   # Session configuration
   SESSION_SECRET=your-secret-key-2026
   
   # Database path
   DB_PATH=./database/doctorpod.db
   
   # Server port
   PORT=3000
   ```
   
   **Important for Deployment**: 
   - Set `BASE_URL` to your production URL (e.g., `https://your-app.onrender.com`)
   - This ensures QR codes point to your live site, not localhost
   
   **Gmail Setup** (for email OTP):
   - Enable 2-Step Verification on Gmail
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Use app password in `EMAIL_PASS`

4. **Initialize database** (auto-runs on first start)
   ```bash
   node initDatabase.js
   ```
   
   This creates the database with sample data:
   - 1 Admin: `admin` / `admin321`
   - 11 Clinics (4 paid + 7 trial)
   - 11 Doctors
   - 10 Patients
   - Sample bookings and visits

5. **Start the server**
   ```bash
   npm start
   ```
   
   The server will:
   - ✅ Auto-initialize database if missing
   - ✅ Preserve existing data on restart
   - ✅ Run on port 3000 (or `PORT` from .env)

6. **Access the application**
   ```
   Landing Page:    http://localhost:3000
   Admin Login:     http://localhost:3000/admin_login.html
   Clinic Login:    http://localhost:3000/clinic_login.html
   Doctor Login:    http://localhost:3000/doctor_login.html
   Patient Booking: http://localhost:3000/patient_booking.html
   ```

### Default Credentials

**Admin:**
- ID: `admin`
- Password: `admin321`

**Clinic (example):**
- ID: `ROOT543211`
- Password: `clinic123`

**Doctor (example):**
- ID: `JASI432101`
- Password: `doc123`

### AI Agent Setup (Optional)

```bash
cd genai_agent
pip install -r requirements.txt
# Configure API keys in environment
python agent.py
```

## 🚢 Deployment (Render.com)

### Preparation

1. **Environment Variables** (add in Render dashboard):
   ```
   EMAIL_USER=doctorpod.info@gmail.com
   EMAIL_PASS=your-gmail-app-password
   SESSION_SECRET=your-secret-key-2026
   DB_PATH=./database/doctorpod.db
   PORT=3000
   ```

2. **Build Command**: `npm install`

3. **Start Command**: `npm start`

### Smart Database Initialization

The app automatically:
- ✅ **First deploy**: Creates database with sample data
- ✅ **Restart**: Preserves all accumulated data
- ✅ **Empty DB**: Reloads sample data
- ✅ **Corrupted DB**: Reinitializes automatically

### Important Notes

- **Ephemeral Storage**: Render's free tier resets database on new deployments
- **For Production**: Use Render PostgreSQL ($7/month) or persistent disk ($1-2/month)
- **Console OTP**: OTP always logs to Render console (visible in logs)
- **Email OTP**: Works only if Gmail app password is correctly configured

### Production Recommendations

For real production use:
1. Migrate to **PostgreSQL** or **MySQL** (persistent storage)
2. Set up **Redis** for session storage (instead of in-memory)
3. Configure **CloudWatch** or **Sentry** for monitoring
4. Use **SendGrid** or **AWS SES** instead of Gmail (better reliability)
5. Enable **rate limiting** and **CORS** properly

## 📡 API Endpoints

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/bookings/book` | Create new appointment |
| `GET` | `/bookings/verify` | Verify booking by mobile |
| `GET` | `/bookings/doctor/:id` | Get doctor's appointments |
| `PUT` | `/bookings/:id/status` | Update consultation status |

### Clinics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/clinic/login` | Clinic authentication |
| `GET` | `/clinic/:id` | Get clinic details |
| `PUT` | `/clinic/:id` | Update clinic info |
| `POST` | `/clinic/forgot-password/send-otp` | Send OTP to email |
| `POST` | `/clinic/forgot-password/verify-otp` | Verify OTP code |
| `POST` | `/clinic/forgot-password/reset` | Reset password |

### Doctors
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/doctor/login` | Doctor authentication |
| `GET` | `/doctor/:id` | Get doctor profile |
| `GET` | `/doctor/:id/clinics` | Get assigned clinics |
| `POST` | `/doctor/forgot-password/send-otp` | Send OTP to email |
| `POST` | `/doctor/forgot-password/verify-otp` | Verify OTP code |
| `POST` | `/doctor/forgot-password/reset` | Reset password |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/patient/search` | Search patients |
| `GET` | `/patient/:id/history` | Get visit history |
| `POST` | `/patient` | Register new patient |

### Prescriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/history/visit` | Save visit/prescription |
| `GET` | `/pdf/generate/:visitId` | Generate PDF |
| `POST` | `/whatsapp/send` | Send via WhatsApp |

## 🔐 Authentication & Security

### Session-Based Authentication

The system uses session-based authentication with role-specific access:

- **Doctors**: Login with `doctor_id` + `password`
- **Clinics**: Login with `clinic_id` + `password`  
- **Admins**: Login with `admin_id` + `password`

Session data is stored in browser `sessionStorage` for frontend state management.

### Password Recovery (OTP System)

**Dual-Mode OTP Delivery:**
- **Console Mode** (Development): OTP printed to server logs
- **Email Mode** (Production): OTP sent via Gmail SMTP

**Recovery Flow:**
1. User enters Doctor/Clinic ID or mobile number
2. System generates 6-digit OTP (valid for 10 minutes)
3. OTP sent to registered email + logged to console
4. User verifies OTP
5. User sets new password
6. Old sessions invalidated

**Email Configuration:**
```javascript
// Uses Nodemailer with Gmail SMTP
{
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // App password, not regular password
  }
}
```

**Security Features:**
- OTP expires in 10 minutes
- Single-use tokens
- Email masking (shows `a****@gmail.com`)
- Resend OTP option
- Rate limiting recommended for production

## 📱 Consultation Flow

```
1. Patient books appointment → booking created (status: not_seen)
2. Doctor opens dashboard → views patient queue
3. Doctor selects patient → status: in_progress
4. Doctor fills prescription → saves visit record
5. System updates status → status: seen
6. Doctor generates PDF → prescription created
7. Optional: Send via WhatsApp → patient notified
```

## 🎨 UI Components

### Doctor Dashboard Features
- **Patient Queue Modal** - View/filter today's appointments
- **Prescription Form** - Vitals, diagnosis, medicines
- **Medicine Autocomplete** - Search from medicine database
- **History Sidebar** - Previous visit records
- **PDF Preview** - Generate and preview prescriptions

### Status Indicators
| Status | Color | Description |
|--------|-------|-------------|
| `not_seen` | 🟡 Yellow | Waiting in queue |
| `in_progress` | 🔵 Blue | Currently being seen |
| `seen` | 🟢 Green | Consultation complete |
| `cancelled` | 🔴 Red | Appointment cancelled |
| `no_show` | ⚫ Gray | Patient didn't arrive |

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DB_PATH=./database/doctorpod.db

# Email (OTP)
EMAIL_USER=doctorpod.info@gmail.com
EMAIL_PASS=your-gmail-app-password

# Session
SESSION_SECRET=your-secret-key-2026
```

### Gmail App Password Setup

1. Go to Google Account: https://myaccount.google.com
2. Security → 2-Step Verification → Enable
3. Security → App passwords
4. Select "Mail" → Generate password
5. Copy 16-character password (remove spaces)
6. Add to `.env` as `EMAIL_PASS`

**Note**: Use app password, NOT your regular Gmail password!

### Clinic Settings

Clinics can configure:
- Operating hours (morning/evening slots)
- Slot duration (15/20/30 minutes)
- Maximum patients per slot
- Doctor assignments

## 📊 Analytics

The system tracks:
- Daily appointment counts
- Consultation completion rates
- Average wait times
- Doctor performance metrics
- Patient feedback scores
- Trial conversion rates

## 🎨 Design & UI

### Color Palette (Professional Healthcare Theme)

```css
--primary: #2563eb        /* Calm professional blue */
--secondary: #0891b2      /* Trustworthy cyan */
--accent: #059669         /* Success green */
--text: #1e293b           /* Dark slate */
--bg: #f8fafc             /* Soft off-white */
```

**Design Principles:**
- ✅ High contrast for readability
- ✅ Eye-friendly calm tones
- ✅ No bright/flashy colors
- ✅ Professional healthcare appearance
- ✅ Fully responsive mobile-first design

### UI Features
- Material Design inspired cards
- Smooth transitions and animations
- Loading states and skeletons
- Toast notifications
- Modal dialogs
- Responsive tables and grids

## 🐛 Troubleshooting

### Common Issues

**1. `better-sqlite3` Module Not Found**
```bash
npm rebuild better-sqlite3
# or
npm install better-sqlite3
```

**2. Email OTP Not Sending**
- Check Gmail 2-Step Verification is enabled
- Verify app password (not regular password)
- Check `.env` file has correct `EMAIL_USER` and `EMAIL_PASS`
- OTP always logs to console as fallback

**3. Database Reset on Render**
- Normal on new deployments (ephemeral storage)
- Use persistent disk or migrate to PostgreSQL
- Database auto-initializes with sample data

**4. Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# or change PORT in .env
```

**5. Session Issues**
- Clear browser localStorage/sessionStorage
- Check SESSION_SECRET in .env
- Enable "trust proxy" for Render deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Contact & Support

**DoctorPod Team**
- 📧 Email: doctorpod.info@gmail.com
- 📱 Phone: +91 9330317102
- 🌐 Website: [Your Website URL]

For support and queries:
- Create an issue in the repository
- Email the development team
- Check the documentation

## 🙏 Acknowledgments

- Built with ❤️ for healthcare professionals
- Powered by modern web technologies
- Designed for ease of use and reliability

## 📝 Changelog

### v1.2.0 (February 2026)
- ✅ **QR Code Appointment Booking** - Seamless clinic-specific booking experience
  - Unique QR codes for each clinic (auto-generated during clinic creation)
  - QR codes stored in `/public/asset/QR/` directory
  - URL format: `patient_booking.html?clinic_id=XXX&from=qr`
  - Pre-fills clinic selection when scanned
  - Tracks booking source (online vs QR) in database
  - Booking source filter in doctor dashboard
  - Close button behavior: try window.close() then history.back() (no redirect to home)
  - QR codes can be updated/replaced via admin/clinic dashboard
  
- ✅ **Clinic Appointments Management** - Advanced appointment tracking and filtering
  - Collapsible "Today's Appointments" section in clinic home page
  - Smart date picker with dynamic heading ("Today's Appointments" / "Appointments for [date]" / "All Appointments")
  - Doctor filter dropdown for multi-doctor clinics
  - Manual refresh button with visual rotation animation
  - Auto-sort by date and time for chronological view
  - Color-coded status badges (pending=orange, completed=green, cancelled=red)
  - Timezone-aware date handling for accurate "today" filtering
  - Patient info with mobile number display
  - Queue number and appointment time visibility
  
- ✅ **Enhanced Form Validation** - Native HTML5 validation across all forms
  - Age input without spinner arrows (text input with pattern validation)
  - Mobile number validation using maxlength and pattern (no popup modals)
  - Email validation using native browser validation
  - Consistent validation approach across admin, clinic, and booking forms
  
- ✅ **Case-Insensitive Authentication** - Improved login UX for all user types
  - Clinic login: case-insensitive `clinic_id` (e.g., "ROOT543211" = "root543211")
  - Doctor login: case-insensitive `doctor_id` (e.g., "DRMU878668" = "drmu878668")
  - Admin login: case-insensitive mobile/email matching
  - SQL queries updated with LOWER() comparison for all identifier fields
  
- ✅ **Mobile-Responsive Headers** - Unified header design across all dashboards
  - Consistent DoctorPod branding on left (logo + subtitle)
  - Action buttons aligned right (Manage Profile / Sign Out / Home)
  - Mobile optimization: smaller logo (32px), compact buttons (0.6875rem font)
  - Logo subtitle scales appropriately on mobile (0.5625rem)
  - One-line layout maintained even on small screens (no wrapping)
  - Applied to: clinic_home, doctor_home, admin_dashboard
  
- ✅ **Admin Dashboard Enhancements**
  - Added Home button for quick navigation to landing page
  - Sign Out button properly clears session and redirects to admin login
  - Logout endpoint implemented (`POST /admin/logout`)
  - Inline onclick handlers for reliable button functionality
  
- ✅ **UI/UX Improvements**
  - Patient booking close button: tries window.close() then history.back()
  - Tentative time displayed with queue number in unified green box
  - Compact modal design (reduced padding, removed icons, × close only)
  - Day validation matches both short (Mon) and full (Monday) formats
  - Check booking auto-clear between mobile and booking ID fields
  - Stats cards optimized: inline layout (label: value on same line)

- ✅ **API Enhancements**
  - New endpoint: `GET /bookings/clinic/:clinicId` with LEFT JOIN to doctors table
  - Doctor names included in appointment data via SQL JOIN
  - Proper session management for admin logout
  - QR booking source tracking in bookings table

### v1.1.0 (February 2026)
- ✅ **Doctor Availability Management** - Restored comprehensive day-by-day availability setting
  - Individual day selection with custom time slots (Monday-Sunday)
  - Configurable slot intervals (5-120 minutes)
  - Available in both Admin and Clinic dashboards
  - Mobile-responsive time selection UI
- ✅ **Collapsible Table Views** - Enhanced UX for data-heavy sections
  - All list tables now collapsible (Demo Requests, Clinics, Doctors)
  - Collapsed by default to reduce scrolling
  - Smooth expand/collapse animations with rotating arrow icons
  - Implemented in Admin and Clinic dashboards
- ✅ **Admin Dashboard Improvements**
  - Reorganized sections for logical workflow: Add Clinic → Add Doctor → Set Availability → Demo Requests → Lists
  - Updated header: "Complete Control Over Your Healthcare Network"
  - Fixed Home button to navigate to landing page
  - Centered dashboard heading for better visual balance
- ✅ **Database Integration** - All availability data correctly stored in `availability_slots` table
- ✅ **Mobile Optimization** - Enhanced responsive design for availability forms and table views

### v1.0.0 (February 2026)
- ✅ Professional blue-cyan-green UI redesign
- ✅ Email OTP password recovery (dual mode)
- ✅ Smart database auto-initialization
- ✅ Render.com production deployment support
- ✅ Gmail SMTP integration (Nodemailer)
- ✅ 30-day free trial system for clinics
- ✅ Clean codebase (removed backup files)
- ✅ Complete documentation update
- ✅ Session security improvements
- ✅ Mobile-responsive design enhancements

---
State Flow for Video Consultations

┌─────────────────────────────────────────────────────────────────────┐
│                        BOOKING CREATED                               │
│            (is_video_consultation=1, consult_status=not_seen,       │
│                    payment_status=pending)                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
    ┌───────────────┐                   ┌───────────────┐
    │  PAY FIRST    │                   │  TRUST/LATER  │
    │  (Mark Paid)  │                   │  (Skip Pay)   │
    └───────────────┘                   └───────────────┘
            │                                   │
            ▼                                   ▼
    payment_status=CONFIRMED            payment_status=pending
            │                                   │
            └─────────────────┬─────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   VIDEO CALL    │
                    │ consult_status  │
                    │  =in_progress   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ DOCTOR SAVES Rx │
                    │ (visit created) │
                    │ consult_status  │
                    │    =seen        │
                    └─────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
    ┌───────────────┐                   ┌───────────────┐
    │ ALREADY PAID  │                   │ PAYMENT DUE   │
    │ ✅ Ready for  │                   │ ⏳ Awaiting   │
    │   Invoice     │                   │   Payment     │
    └───────────────┘                   └───────────────┘
            │                                   │
            │                          (Clinic marks paid)
            │                                   │
            └─────────────────┬─────────────────┘
                              ▼
                    ┌─────────────────┐
                    │ GENERATE INVOICE│
                    │  (both ✅)      │
                    └─────────────────┘

**DoctorPod** - Simplifying Healthcare Management 🏥  
*Quick. Smart. Trusted.*
