# Project Structure

Complete directory structure and file organization for Dizidental Multi-Client HMS.

---


## 🎯 Client Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Hostinger KVM VPS (doctor32.in)     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Shared PostgreSQL (Port 5432)                  │   │
│  │  ├── clinic_hms_xyz   (appuser)                 │   │
│  │  ├── clinic_hms_abc   (appuser)                 │   │
│  │  └── clinic_hms_def   (appuser)                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │  Client XYZ         │  │  Client ABC         │     │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │     │
│  │  │ Frontend:3001 │  │  │  │ Frontend:3002 │  │     │
│  │  └───────────────┘  │  │  └───────────────┘  │     │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │     │
│  │  │ Backend:8081  │  │  │  │ Backend:8082  │  │     │
│  │  └───────────────┘  │  │  └───────────────┘  │     │
│  └─────────────────────┘  └─────────────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Nginx Reverse Proxy (Port 80, 443)             │   │
│  │  xyz.doctor32.in  → XYZ containers   │   │
│  │  abc.doctor32.in  → ABC containers   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📁 Root Directory Structure

```
dizidentmain/
├── clientxyz/                 # Client XYZ - Multi-speciality clinic
├── clientabc/                 # Client ABC - Dental clinic
├── backend/                   # Shared backend template (for new clients)
├── frontend/                  # Shared frontend template (for new clients)
├── scripts/                   # Deployment and utility scripts
├── README.md                  # Project overview and quick start
├── VPS_SETUP_GUIDE.md        # Complete VPS setup and deployment guide
└── STRUCTURE.md              # This file - Project structure documentation
```

---

## 🏢 Client Directory Structure

Each client follows the same structure pattern:

```
clientxyz/                     # Replace 'xyz' with client identifier
├── backend/                   # Spring Boot backend application
├── frontend/                  # React + Vite frontend application
├── docker-compose.yml         # Local development configuration
├── docker-compose.prod.yml    # Production VPS configuration
├── .env.prod                  # Production environment variables (not in git)
└── .gitignore                # Git ignore rules
```

---

## 🔧 Backend Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/clinic/hms/
│   │   │   ├── config/              # Application configuration
│   │   │   │   ├── CorsConfig.java
│   │   │   │   ├── DataSeeder.java  # Auto-create admin user
│   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   └── WebConfig.java
│   │   │   │
│   │   │   ├── controller/          # REST API endpoints
│   │   │   │   ├── AppointmentController.java
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── BillingController.java
│   │   │   │   ├── DoctorController.java
│   │   │   │   ├── InventoryController.java
│   │   │   │   ├── LabController.java
│   │   │   │   ├── PatientController.java
│   │   │   │   ├── PrescriptionController.java
│   │   │   │   ├── ReportController.java
│   │   │   │   ├── TreatmentController.java
│   │   │   │   ├── UserController.java
│   │   │   │   └── VendorController.java
│   │   │   │
│   │   │   ├── dto/                 # Data Transfer Objects
│   │   │   │   ├── request/         # API request DTOs
│   │   │   │   │   ├── AppointmentRequest.java
│   │   │   │   │   ├── BillingRequest.java
│   │   │   │   │   ├── LoginRequest.java
│   │   │   │   │   ├── PatientRequest.java
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   └── response/        # API response DTOs
│   │   │   │       ├── AppointmentResponse.java
│   │   │   │       ├── AuthResponse.java
│   │   │   │       ├── PatientResponse.java
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── entity/              # JPA entity models
│   │   │   │   ├── Appointment.java
│   │   │   │   ├── Billing.java
│   │   │   │   ├── Doctor.java
│   │   │   │   ├── Inventory.java
│   │   │   │   ├── LabTest.java
│   │   │   │   ├── Patient.java
│   │   │   │   ├── Prescription.java
│   │   │   │   ├── Role.java
│   │   │   │   ├── Treatment.java
│   │   │   │   ├── User.java
│   │   │   │   └── Vendor.java
│   │   │   │
│   │   │   ├── exception/           # Custom exceptions
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   └── UnauthorizedException.java
│   │   │   │
│   │   │   ├── repository/          # Spring Data JPA repositories
│   │   │   │   ├── AppointmentRepository.java
│   │   │   │   ├── BillingRepository.java
│   │   │   │   ├── DoctorRepository.java
│   │   │   │   ├── InventoryRepository.java
│   │   │   │   ├── LabTestRepository.java
│   │   │   │   ├── PatientRepository.java
│   │   │   │   ├── PrescriptionRepository.java
│   │   │   │   ├── RoleRepository.java
│   │   │   │   ├── TreatmentRepository.java
│   │   │   │   ├── UserRepository.java
│   │   │   │   └── VendorRepository.java
│   │   │   │
│   │   │   ├── security/            # JWT and authentication
│   │   │   │   ├── JwtTokenProvider.java
│   │   │   │   └── UserDetailsServiceImpl.java
│   │   │   │
│   │   │   ├── service/             # Business logic
│   │   │   │   ├── AppointmentService.java
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── BillingService.java
│   │   │   │   ├── DoctorService.java
│   │   │   │   ├── InventoryService.java
│   │   │   │   ├── LabService.java
│   │   │   │   ├── PatientService.java
│   │   │   │   ├── PrescriptionService.java
│   │   │   │   ├── ReportService.java
│   │   │   │   ├── TreatmentService.java
│   │   │   │   ├── UserService.java
│   │   │   │   └── VendorService.java
│   │   │   │
│   │   │   └── util/                # Utility classes
│   │   │       ├── DateUtil.java
│   │   │       └── ValidationUtil.java
│   │   │
│   │   └── resources/
│   │       ├── application.properties    # Spring Boot configuration
│   │       ├── data/
│   │       │   └── treatment_master.json # Treatment data seed
│   │       ├── static/                   # Static resources
│   │       └── templates/                # Email templates (if any)
│   │
│   └── test/
│       └── java/com/clinic/hms/          # Unit and integration tests
│           └── ClinicHmsApplicationTests.java
│
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
│
├── build.gradle                   # Gradle build configuration
├── gradlew                        # Gradle wrapper (Unix)
├── gradlew.bat                    # Gradle wrapper (Windows)
├── settings.gradle                # Gradle settings
├── HELP.md                        # Backend help documentation
└── Dockerfile                     # Docker image configuration
```

---

## 🎨 Frontend Structure

```
frontend/
├── public/                        # Static assets
│   ├── css/
│   │   ├── style.css             # Main stylesheet
│   │   ├── remixicon.css         # Icon library
│   │   └── lib/                  # Third-party CSS
│   │
│   ├── fonts/                    # Custom fonts
│   ├── images/                   # Images and assets
│   │   ├── auth/
│   │   ├── home-eight/
│   │   ├── home-nine/
│   │   ├── payment/
│   │   └── user-grid/
│   │
│   ├── js/
│   │   └── lib/                  # Third-party JavaScript
│   │
│   └── webfonts/                 # Web font files
│
├── src/
│   ├── api/
│   │   └── api.js                # Axios API configuration
│   │
│   ├── assets/
│   │   └── css/                  # Component-specific styles
│   │
│   ├── components/               # Reusable React components
│   │   ├── billing/              # Billing-related components
│   │   │   ├── BillingForm.jsx
│   │   │   ├── BillingList.jsx
│   │   │   ├── InvoicePrint.jsx
│   │   │   └── PaymentModal.jsx
│   │   │
│   │   ├── chat/                 # Chat/messaging components
│   │   │   ├── ChatBox.jsx
│   │   │   └── ChatList.jsx
│   │   │
│   │   ├── clinical/             # Clinical management
│   │   │   ├── ClinicalNotes.jsx
│   │   │   ├── DiagnosisForm.jsx
│   │   │   └── VitalSigns.jsx
│   │   │
│   │   ├── common/               # Shared UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── DataTable.jsx
│   │   │   ├── FormInput.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   └── Sidebar.jsx
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── Footer.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── MainLayout.jsx
│   │   │   └── Navbar.jsx
│   │   │
│   │   ├── odontogram/           # Dental chart (tooth diagram)
│   │   │   ├── Odontogram.jsx
│   │   │   └── ToothSelector.jsx
│   │   │
│   │   ├── print/                # Print templates
│   │   │   ├── ConsentForm.jsx
│   │   │   ├── InvoicePrint.jsx
│   │   │   ├── LabReport.jsx
│   │   │   └── PrescriptionPrint.jsx
│   │   │
│   │   ├── reports/              # Report generation
│   │   │   ├── AppointmentReport.jsx
│   │   │   ├── BillingReport.jsx
│   │   │   ├── PatientReport.jsx
│   │   │   └── ReportFilters.jsx
│   │   │
│   │   └── rx/                   # Prescription components
│   │       ├── MedicineSelector.jsx
│   │       └── PrescriptionForm.jsx
│   │
│   ├── pages/                    # Page-level components (routes)
│   │   ├── BillingView.jsx
│   │   ├── ConsentPostOpView.jsx
│   │   ├── DiagnosisView.jsx
│   │   ├── DoctorEntry.jsx
│   │   ├── InventoryView.jsx
│   │   ├── LabEntryView.jsx
│   │   ├── LoginPage.jsx
│   │   ├── PatientAdd.jsx
│   │   ├── PatientEntry.jsx
│   │   ├── ReportsView.jsx
│   │   ├── ScheduleView.jsx
│   │   ├── TreatmentPlanView.jsx
│   │   ├── VendorEntry.jsx
│   │   │
│   │   ├── chat/
│   │   │   └── ChatView.jsx
│   │   │
│   │   ├── dashboards/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   └── ReceptionistDashboard.jsx
│   │   │
│   │   └── patient/
│   │       ├── PatientDetail.jsx
│   │       └── PatientList.jsx
│   │
│   ├── utils/                    # Utility functions
│   │   ├── dateFormat.js         # Date formatting helpers
│   │   └── patientList.js        # Patient data helpers
│   │
│   ├── App.jsx                   # Main React component
│   ├── config.js                 # Frontend configuration
│   └── main.jsx                  # React entry point
│
├── index.html                    # HTML template
├── package.json                  # NPM dependencies and scripts
├── vite.config.js               # Vite build configuration
├── eslint.config.js             # ESLint configuration
├── Dockerfile                    # Docker image configuration
├── nginx.conf                    # Nginx configuration for Docker
└── README.md                     # Frontend documentation
```

---

## 🚀 Scripts Directory

```
scripts/
├── deploy-vps.sh                 # Main deployment script (Bash)
├── deploy-vps.ps1                # Main deployment script (PowerShell)
├── drop_visit_treatment_plan.sql # Database maintenance script
└── seed_treatment_master.sql     # Treatment master data seeding
```

---

## 🐳 Docker Configuration

### Development (docker-compose.yml)
```yaml
# Local development environment
# - Backend: localhost:8080
# - Frontend: localhost:3000
# - PostgreSQL: localhost:5432
```

### Production (docker-compose.prod.yml)
```yaml
# VPS production environment
# - Backend: Internal port 8080, External port 8081/8082/etc.
# - Frontend: Internal port 80, External port 3001/3002/etc.
# - PostgreSQL: Host machine localhost:5432
# - Includes extra_hosts for Linux Docker networking
```

---

## 📦 Key Configuration Files

### Backend Configuration

**application.properties**
```properties
# Spring Boot configuration
# Database connection
# JWT settings
# JPA/Hibernate settings
# Server port and context
# Actuator endpoints
```

### Frontend Configuration

**config.js**
```javascript
// API base URL
// Environment-specific settings
// Feature flags
```

**vite.config.js**
```javascript
// Vite build configuration
// Proxy settings for development
// Build optimization
```

---

## 🗄️ Database Structure

### Tables Created by Hibernate

```
users                     # System users (doctors, staff, admin)
roles                     # User roles
patients                  # Patient records
appointments              # Appointment scheduling
treatments                # Treatment plans
prescriptions             # Medicine prescriptions
billing                   # Invoices and payments
lab_tests                 # Laboratory tests
inventory                 # Stock management
vendors                   # Supplier management
doctors                   # Doctor profiles
```

---

## 🔑 Environment Variables

### Production (.env.prod)

```env
# PostgreSQL
SPRING_DATASOURCE_USERNAME=appuser
SPRING_DATASOURCE_PASSWORD=9932

# JWT Secret
JWT_SECRET=unique_secret_key_minimum_32_characters

# API Base URL
VITE_API_BASE=https://xyz.doctor32.in/api
```

---

## 📊 Port Allocation

| Client | Frontend | Backend | Database |
|--------|----------|---------|----------|
| XYZ    | 3001     | 8081    | clinic_hms_xyz |
| ABC    | 3002     | 8082    | clinic_hms_abc |
| DEF    | 3003     | 8083    | clinic_hms_def |
| GHI    | 3004     | 8084    | clinic_hms_ghi |

**Pattern:**
- Frontend: 300X (where X = client number)
- Backend: 808X (where X = client number)
- Database: clinic_hms_{clientid}

---

## 🌐 URL Structure

### Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080/api`

### Production
- Frontend: `https://{clientid}.doctor32.in`
- Backend: `https://{clientid}.doctor32.in/api`

---

## 🔐 API Endpoints Structure

```
/api/auth/*              # Authentication endpoints
/api/patients/*          # Patient management
/api/appointments/*      # Appointment scheduling
/api/treatments/*        # Treatment plans
/api/prescriptions/*     # Prescriptions
/api/billing/*          # Billing and invoices
/api/lab/*              # Laboratory tests
/api/inventory/*        # Stock management
/api/users/*            # User management
/api/doctors/*          # Doctor profiles
/api/vendors/*          # Vendor management
/api/reports/*          # Report generation
/actuator/health        # Health check endpoint
```

---

## 📝 File Naming Conventions

### Backend (Java)
- **Controllers:** `{Entity}Controller.java` (e.g., PatientController.java)
- **Services:** `{Entity}Service.java` (e.g., PatientService.java)
- **Repositories:** `{Entity}Repository.java` (e.g., PatientRepository.java)
- **Entities:** `{Entity}.java` (e.g., Patient.java)
- **DTOs:** `{Entity}Request.java` / `{Entity}Response.java`

### Frontend (React)
- **Components:** `PascalCase.jsx` (e.g., PatientList.jsx)
- **Pages:** `{Feature}View.jsx` (e.g., BillingView.jsx)
- **Utilities:** `camelCase.js` (e.g., dateFormat.js)
- **Styles:** `kebab-case.css` (e.g., patient-list.css)

---

## 🎯 Module Dependencies

### Backend (Gradle)
```
Spring Boot Starter Web
Spring Boot Starter Data JPA
Spring Boot Starter Security
PostgreSQL Driver
JWT (io.jsonwebtoken)
Lombok
Spring Boot Starter Validation
Spring Boot Starter Actuator
```

### Frontend (NPM)
```
React
Vite
Axios
React Router DOM
RemixIcon
Date formatting libraries
Chart libraries (if used)
```

---

## 📖 Documentation Files

```
README.md              # Project overview, quick start
VPS_SETUP_GUIDE.md    # Complete VPS deployment guide
STRUCTURE.md          # This file - Project structure
.gitignore            # Git exclusions
```

---

## 🔄 Git Workflow

```
master                 # Production branch
├── clientxyz/        # Client directories
├── clientabc/
├── backend/          # Shared templates
├── frontend/
└── scripts/          # Deployment scripts
```

**Excluded from Git:**
- `.env.prod` (contains credentials)
- `node_modules/`
- `build/`
- `dist/`
- `uploads/`
- IDE-specific files

---

## 🚀 Deployment Flow

```
Local Development
    ↓
Git Commit & Push
    ↓
VPS: git pull
    ↓
./scripts/deploy-vps.sh clientxyz master
    ↓
Docker Build & Deploy
    ↓
Application Running
```

---

**Last Updated:** February 11, 2026

**Repository:** https://github.com/dsoul2710/dizidentmain

