# DoctorPod 🏥

A comprehensive medical appointment booking and clinic management system built with Node.js, Express, and SQLite.

## 📋 Overview

DoctorPod is a full-stack healthcare management platform that streamlines patient appointments, doctor consultations, prescription management, and clinic operations. It features multi-role dashboards, real-time queue management, PDF prescription generation, and WhatsApp integration for patient notifications.

## ✨ Features

### 👨‍⚕️ Doctor Dashboard
- View daily patient queue with real-time status updates
- Digital prescription writing with medicine autocomplete
- Patient visit history lookup
- PDF prescription generation with clinic branding
- WhatsApp prescription sharing
- Diagnosis and medicine management

### 🏥 Clinic Dashboard
- Manage clinic details and timings
- Configure availability slots
- View and manage doctor assignments
- Track daily appointments and analytics

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

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js + Express.js |
| **Database** | SQLite (better-sqlite3) |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **PDF Generation** | PDFKit |
| **QR Codes** | qrcode library |
| **AI Agent** | Python (Gemini API) |

## 📁 Project Structure

```
Doctopod_new_js/
├── app.js                    # Express server entry point
├── initDatabase.js           # Database initialization script
├── initAssistantAccessIds.js # Access ID setup
├── package.json
│
├── database/
│   ├── doctorpod.db          # SQLite database file
│   ├── schema_new.sql        # Complete database schema
│   ├── sample_data_new.sql   # Sample data for testing
│   ├── dataflow.md           # Data flow documentation
│   ├── dataflow_diagram.md   # Mermaid diagrams
│   ├── INTEGRATION_GUIDE.md  # API integration guide
│   └── migrations/           # Database migrations
│
├── src/
│   ├── controllers/          # Route handlers
│   │   ├── adminController.js
│   │   ├── availabilityController.js
│   │   ├── bookingController.js
│   │   ├── clinicController.js
│   │   ├── doctorController.js
│   │   ├── historyController.js
│   │   ├── medicineController.js
│   │   ├── patientController.js
│   │   ├── pdfController.js
│   │   ├── updateHistoryController.js
│   │   └── whatsappController.js
│   │
│   ├── routes/               # Express route definitions
│   │   ├── adminRoutes.js
│   │   ├── availabilityRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── clinicRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── historyRoutes.js
│   │   ├── medicineRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── pdfRoutes.js
│   │   ├── updateHistoryRoutes.js
│   │   └── whatsappRoutes.js
│   │
│   └── utils/                # Utility functions
│       ├── db.js             # Database connection
│       ├── dbHelper.js       # Query helpers
│       ├── fileHelper.js     # File operations
│       ├── idGenerator.js    # Unique ID generation
│       └── slotGenerator.js  # Time slot generation
│
├── public/                   # Frontend static files
│   ├── index.html            # Landing page
│   ├── patient_booking.html  # Patient booking interface
│   ├── check_booking.html    # Booking verification
│   ├── doctor_login.html     # Doctor authentication
│   ├── doctor_dashboard.html # Doctor consultation UI
│   ├── clinic_login.html     # Clinic authentication
│   ├── clinic_dashboard.html # Clinic management UI
│   ├── admin_login.html      # Admin authentication
│   ├── admin_dashboard.html  # System admin UI
│   │
│   ├── css/
│   │   └── styles.css        # Global styles
│   │
│   ├── js/                   # Frontend JavaScript
│   │   ├── app.js
│   │   ├── main.js
│   │   ├── doctorDashboard.js
│   │   ├── clinicDashboard.js
│   │   ├── adminDashboard.js
│   │   └── ...
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
│   ├── message_agent.py
│   ├── whatsapp_agent.py
│   └── requirements.txt
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

- Node.js 18+ 
- npm or yarn
- Python 3.9+ (for AI agents)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Doctopod_new_js
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   node initDatabase.js
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open http://localhost:3000 in your browser

### AI Agent Setup (Optional)

```bash
cd genai_agent
pip install -r requirements.txt
# Configure API keys in environment
python agent.py
```

## 📡 API Endpoints

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/bookings/book` | Create new appointment |
| `GET` | `/bookings/verify` | Verify booking by mobile |
| `GET` | `/bookings/doctor/:id` | Get doctor's appointments |
| `PUT` | `/bookings/:id/status` | Update consultation status |

### Doctors
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/doctor/login` | Doctor authentication |
| `GET` | `/doctor/:id` | Get doctor profile |
| `GET` | `/doctor/:id/clinics` | Get assigned clinics |

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

### Clinics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/clinic/login` | Clinic authentication |
| `GET` | `/clinic/:id` | Get clinic details |
| `PUT` | `/clinic/:id` | Update clinic info |

## 🔐 Authentication

The system uses session-based authentication with role-specific access:

- **Doctors**: Login with `doctor_id` + `password`
- **Clinics**: Login with `clinic_id` + `password`  
- **Admins**: Login with `admin_id` + `password`

Session data is stored in browser `sessionStorage` for frontend state management.

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
PORT=3000
NODE_ENV=development
DB_PATH=./database/doctorpod.db
```

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Support

For support and queries:
- Create an issue in the repository
- Contact the development team

---

**DoctorPod** - Simplifying Healthcare Management 🏥
