# Dizidental - Multi-Client HMS (Hospital Management System) Project Context & Technical Reference

This document provides a comprehensive overview of the **Dizidental Hospital Management System (HMS)**. It is designed to give any AI assistant immediate, complete, and accurate context about the business logic, directory structure, user account relations, database schemas, modules, and screens of the application.

---

## 1. System Overview & Architecture

Dizidental is a multi-tenant / multi-client HMS. It utilizes a **shared PostgreSQL instance with isolated physical databases** and **containerized backend/frontend deployments per client**. Subdomains route requests to appropriate client containers.

### Multi-Tenant Deployment Model
*   **Production Host:** Hostinger KVM VPS (`doctor32.in`)
*   **Reverse Proxy:** Nginx routes subdomains (e.g., `xyz.doctor32.in` → XYZ containers, `smiledental.dizidental.com` → ABC containers).
*   **Database Isolation:**
    *   Shared PostgreSQL Instance (Port 5432) on VPS.
    *   Separate databases per client: `clinic_hms_xyz` (Client XYZ), `clinic_hms_abc` (Client ABC), etc.
*   **Port Allocation Pattern:**
    *   **Frontend Container:** Internal port 80, mapped to host port `300X` (where X = client number).
    *   **Backend Container:** Internal port 8080, mapped to host port `808X` (where X = client number).
    *   **Database naming:** `clinic_hms_{clientid}`.

### Code Organization & Synchronizing Workflow
*   `/dev/`: The main local development environment (shared template). Developers write and test code here first.
*   `/clientxyz/` and `/clientabc/`: Client-specific production directories.
*   **Sync Script:** `./scripts/sync-to-client.sh` (or `dev-local.ps1` / `sync-to-client.ps1` on Windows) is used to replicate backend services or frontend pages from `dev/` to individual client folders, maintaining client-specific customizations if needed.
*   **VPS Deployment Script:** `./scripts/deploy-vps.sh` executes git pulls on the VPS, builds Docker containers, and updates Nginx.

---

## 2. Directory Structure

```
dizidentmain/
├── dev/                             # Local development environment
│   ├── backend/                     # Spring Boot 3.x backend application
│   ├── frontend/                    # React + Vite frontend application
│   ├── docker-compose.yml           # Dev environment Docker compose
│   └── .env                         # Dev environment configurations
├── clientxyz/                       # Client XYZ production code
├── clientabc/                       # Client ABC production code
├── scripts/                         # Automation & deployment scripts
│   ├── dev-local.sh / .ps1          # Start local dev environments
│   ├── sync-to-client.sh / .ps1     # Sync changes from /dev to client folders
│   ├── deploy-vps.sh / .ps1         # VPS Docker rebuild & redeployment scripts
│   └── seed_treatment_master.sql    # Core treatment master seeding script
├── README.md                        # Setup instructions
├── STRUCTURE.md                     # Raw layout details
└── PROJECT_CONTEXT.md               # This context document
```

---

## 3. Technology Stack

### Backend
*   **Framework:** Spring Boot 3.2+ (Java 21)
*   **Security:** Spring Security with Stateless JWT Authentication
*   **Persistence:** Spring Data JPA with Hibernate ORM
*   **Database:** PostgreSQL 16
*   **Build Tool:** Gradle (Wrapper included)
*   **Key Dependencies:** Lombok, Spring Boot Starter Web, JPA, Security, Validation, Actuator (for health checks).

### Frontend
*   **Library:** React 18
*   **Build Tool:** Vite
*   **Styling:** Custom Vanilla CSS (curated HSL palettes, glassmorphism, responsive dashboard layout).
*   **Icons:** RemixIcon (`remixicon.css`)
*   **HTTP Client:** Axios (configured with intercepts in `src/api/api.js`)
*   **Router:** React Router DOM

---

## 4. User Account Relations & Permissions

The project uses a **1-to-1 Extension Table Design** to associate system users with specific clinical roles. A single `users` table handles authentication, while detail tables store profile data.

```
                  ┌──────────────────────┐
                  │        users         │ (mobile, password, role, is_active)
                  └──────────┬───────────┘
                             │ (1-to-1 via MapsId)
         ┌───────────────────┼───────────────────┬───────────────────┐
 ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
 │   patients    │   │    doctors    │   │ org_hospitals │   │service_providers
 └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
 (unique_id: PAT-)   (unique_id: DOC-)   (org_name, etc.)    (unique_id: SP-)
```

### Roles (`UserRole` Enum)
1.  **`SUPER_ADMIN` / `SUPERADMIN`:** Global administrator for the client tenant. Accesses all clinic administration modules.
2.  **`ORG_HOSPITAL` / `ORG`:** Clinic branch administrator. Configures clinic settings, doctors, lab/vendor masters, billing, and reports.
3.  **`DOCTOR`:** Clinical provider. Manages appointments, diagnoses, odontogram charts, prescriptions, and post-op consents.
4.  **`PATIENT`:** Clinic client. Accesses schedules, records, prescriptions, billing invoices, and consent documentation.
5.  **`SERVICE_PROVIDER`:** Partner portal integrations (Labs, Bed Managers, Pharmacies, Radiology, Pathology, Blood Banks, Ambulance, Orthodontic Labs).

### Dynamic Permissions System (`ModulePermission`)
Dizidental implements a fine-grained, dynamic module permission system. In addition to roles, permissions are defined per-user, per-module, stored in the `module_permissions` table:
*   **Columns:** `module_name` (String), `can_view` (Boolean), `can_edit` (Boolean), `can_delete` (Boolean).
*   **Autobootstrapping (on first login):**
    *   `SUPER_ADMIN` / `ORG_HOSPITAL`: Assigned modules `OVERVIEW`, `PATIENTS`, `DOCTORS`, `LAB_ENTRY`, `VENDOR_ENTRY`, `APPOINTMENTS`, `PRESCRIPTION`, `CONSENT_FORMS`, `CHAT`, `BILLING_FINANCE`, `INVENTORY`, `USER_MANAGEMENT` with full edit/delete rights.
    *   `DOCTOR`: Assigned `OVERVIEW`, `PATIENTS`, `APPOINTMENTS`, `PRESCRIPTION`, `CONSENT_FORMS`, `CHAT` (view and edit, no delete).
    *   `PATIENT`: Assigned `OVERVIEW`, `APPOINTMENTS`, `PRESCRIPTION`, `BILLING_FINANCE`, `CHAT` (view only).
    *   `SERVICE_PROVIDER`: Assigned `OVERVIEW`, `CHAT`, plus custom modules matching their registration types (e.g., `LAB_ORDERS_MODULE` if registered as `LAB`, `BED_ALLOCATION_MODULE` if `BED_MANAGER`, etc.).

---

## 5. Core Multi-Module Relationships

Within a single database instance, the application operates with the following relationships:

1.  **Multi-Organization Mappings:**
    *   Doctors, Patients, and Service Providers map to `OrgHospital` through mapping entities:
        *   `DoctorOrgMapping`: Resolves which doctor practices at which clinic branch.
        *   `PatientOrgMapping`: Establishes which patient belongs to which clinic branch.
        *   `ServiceProviderOrgMapping`: Tracks partner service providers contracted with which clinic branch.
    *   All clinical data (Appointments, Visits, Bills, Prescriptions, Inventory) contains an `org_user_id` foreign key referencing `OrgHospital` (which maps back to the root `User` record).
2.  **Clinical Visit Flow:**
    *   An `Appointment` is scheduled for a `Patient` with a `Doctor`.
    *   When the patient arrives, the receptionist or doctor creates a `Visit`.
    *   The `Visit` has multiple child items:
        *   `VisitExaminationItem` (referencing `ExamItemMaster`) records vital signs and abnormalities.
        *   `VisitTreatment` models planned treatment procedures (referencing `TreatmentProcedureMaster`).
        *   `VisitTreatmentItem` logs completed treatments, prices, and selected teeth numbers.
        *   `Prescription` records medication directions (child items: `PrescriptionItem`).
        *   `Bill` aggregates visit treatments and prescriptions into invoices (child items: `BillItem`).
3.  **Inventory & Treatment Consumables:**
    *   Clinic procedures require physical items (syringes, implants, medicine).
    *   `TreatmentInventoryTemplate` maps `TreatmentProcedureMaster` to `InventoryItem`, stating the exact `quantity_per_procedure`.
    *   Alternatively, `InventoryTreatmentTemplate` groups several items into a "kit" via `InventoryTreatmentTemplateRow`.
    *   When a `VisitTreatment` changes status or is logged in `VisitTreatmentItem`, the system creates an `InventoryMovement` (Direction: `OUT`), subtracting the consumable quantities from the `InventoryItem`'s `current_stock`.

---

## 6. Functional Modules & Screen Flow

### A. Authentication & Session Security
*   **Login Interface:** Users input mobile numbers and passwords.
*   **Cookie Storage:** Successful login issues a stateless JWT token written to an HTTP-only cookie named `hms_token`.
*   **Response Payload:** Returns user metrics, mapped names, and module permission blocks.
*   **Security Configuration:** Handled in `SecurityConfig.java`. Permissive requests on `/api/**` bypass standard filters temporarily, but security contexts are parsed via `JwtAuthenticationFilter`. Passwords are currently compared via `NoOpPasswordEncoder` (to be migrated to BCrypt).

### B. Patient Management
*   **Add / Edit Patient:** Records demographics (name, DOB, age, gender, city), allergies, medical history, primary complaint, and referred-by details.
*   **File Attachments:** Stores file paths for ID/Insurance uploads (`id_insurance_file_path`) and past clinical reports (`past_reports_file_path`).
*   **Details View:** Displays patient timeline, historical visits, clinical notes, diagnosis, bills, and chat logs.

### C. Appointments & Scheduling
*   **Schedule Grid:** Front-end interactive calendar.
*   **Booking Modal:** Receptionist/doctor selects a patient, doctor, date, start time, end time, reasons, and notes. Mapped to `OrgHospital`.
*   **Status Management:** Tracks state transitions: `BOOKED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`.

### D. Clinical Visits & Examinations
*   **Visit Entity:** Represents a check-in event. Tracks visit type (NEW, FOLLOWUP, EMERGENCY) and chief complaints.
*   **Vitals Signs & Section Exams:** `VisitExaminationItem` models physical inspections (e.g. general, dental, oral health) referencing `ExamItemMaster`. Vitals are serialized in a `vitals_json` block.

### E. Dental Odontogram (Tooth Chart)
*   **Visual Component:** An interactive svg-based tooth layout in `Odontogram.jsx`.
*   **Modes:**
    *   `adult`: Renders adult teeth numbered 11-18, 21-28, 31-38, and 41-48.
    *   `child`: Renders child deciduous teeth numbered 51-55, 61-65, 71-75, and 81-85.
*   **Data Serialization:** Selected teeth numbers are saved inside `Visit` (`odo_teeth_json` as a comma-separated list or JSON) and linked within `VisitTreatmentItem` to map custom procedures to specific teeth.

### F. Treatment Planning & Logs
*   **Procedures Master:** Standard master catalog (`TreatmentProcedureMaster`) sorted under categories (`TreatmentCategoryMaster`). Stores template details: `consent_text` and `guideline_text`.
*   **Treatment Plan:** Drafts future procedures as `VisitTreatment` items. Calculates net amounts based on quantity, unit price, and discount amount.
*   **Treatment Logs:** `VisitTreatmentItem` records procedures performed during the current visit, selected teeth list, and customized execution pricing.

### G. Prescription System (Rx)
*   **Writing Rx:** Doctors prescribe medicines using a searchable template catalog (`PrescriptionTemplate`) or manually entering information.
*   **Prescription Details:** Each item (`PrescriptionItem`) includes: `medicine_name`, `medicine_type` (tablet, syrup, etc.), `volume` (strength/qty), `dose` (frequency e.g. 1-0-1), `days` (duration), `timings` (Pre/Post meal), and instructions.

### H. Billing, Payments & Finance
*   **Invoice Generator:** Created from completed visit treatment logs and pharmacy details.
*   **Calculations:** Tracks `gross_amount`, `discount_amount`, `tax_amount`, and `net_amount` in `Bill`.
*   **Payments:** `BillPayment` logs partial or full payment transactions.
    *   **Payment Methods:** CASH, CARD, UPI, NEFT, CHEQUE.
    *   **Invoice Status:** `UNPAID`, `PAID`, `PARTIALLY_PAID`.
*   **Printable Invoices:** Customized printable CSS layouts in `InvoicePrint.jsx`.

### I. Inventory & Vendor Management
*   **Inventory Master:** Catalog of clinical consumables (`InventoryItem`) including code, name, category, unit, unit price, and reorder levels. Mapped to `Vendor`.
*   **Stock Ledger:** `InventoryMovement` tracks stock adjustments (IN/OUT), recording balances after transaction, and maps consumption back to specific `Visit` and `VisitTreatment` IDs.
*   **Low Stock Alerts:** Highlights items where `current_stock` is less than or equal to `reorder_level`.

### J. Partner Service Provider Portals
*   **Portal Logic:** Allows external service partners (Labs, Pharmacies, Ambulances, etc.) to log in with dedicated dashboards.
*   **Order Fulfillment:** Partners view requests matching their specialty (e.g., a LAB provider logs into `LabOrdersView` to update patient lab tests).
*   **Mappings:** Associated via `ServiceProviderOrgMapping` to establish routing to patient files.

### K. Internal Messaging (Chat)
*   **Clinic Communications:** Internal messaging module for staff-doctor coordination and patient-doctor telehealth threads.
*   **Threads & Messages:** `ChatThread` groups conversations. `ChatMessage` tracks body contents and read status. Supports upload mappings in `ChatAttachment` for image and document sharing.

---

## 7. Database Schemas (Hibernate / JPA Mappings)

All entities inherit from `AuditableEntity` (where marked) or contain standard timestamps. Below are structural maps of the PostgreSQL tables.

### Base Auditing Columns (Inherited via `@MappedSuperclass`)
*   `created_at`: `timestamp` (NOT NULL)
*   `updated_at`: `timestamp` (NOT NULL)
*   `created_by_user_id`: `bigint`
*   `updated_by_user_id`: `bigint`
*   `is_deleted`: `boolean` (NOT NULL, DEFAULT false)
*   `deleted_at`: `timestamp`
*   `deleted_by_user_id`: `bigint`

---

### Core Security & Users

#### Table: `users`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `mobile`: `varchar(15)` (NOT NULL, UNIQUE)
*   `password`: `varchar(15)` (NOT NULL)
*   `role`: `varchar(30)` (NOT NULL) - `UserRole` enum values
*   `is_active`: `boolean` (NOT NULL, DEFAULT true)
*   `created_at`: `timestamp`
*   `updated_at`: `timestamp`

#### Table: `module_permissions`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `user_id`: `bigint` (FOREIGN KEY → `users.id`, NOT NULL)
*   `module_name`: `varchar(50)` (NOT NULL)
*   `can_view`: `boolean` (NOT NULL, DEFAULT true)
*   `can_edit`: `boolean` (NOT NULL, DEFAULT false)
*   `can_delete`: `boolean` (NOT NULL, DEFAULT false)
*   *Constraint:* UNIQUE(`user_id`, `module_name`)

---

### User Profile Extensions (1-to-1)

#### Table: `super_admins`
*   `user_id`: `bigint` (PRIMARY KEY, FOREIGN KEY → `users.id`)
*   `full_name`: `varchar(150)` (NOT NULL)
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id` / `updated_by_user_id`: `bigint`

#### Table: `org_hospitals` (extends `AuditableEntity`)
*   `user_id`: `bigint` (PRIMARY KEY, FOREIGN KEY → `users.id`)
*   `org_name`: `varchar(200)` (NOT NULL)
*   `address`: `varchar(500)`
*   `license_number`: `varchar(100)`

#### Table: `doctors` (extends `AuditableEntity`)
*   `user_id`: `bigint` (PRIMARY KEY, FOREIGN KEY → `users.id`)
*   `full_name`: `varchar(150)` (NOT NULL)
*   `speciality`: `varchar(150)`
*   `license_number`: `varchar(50)`
*   `unique_id`: `varchar(20)` (NOT NULL, UNIQUE) - Format: `DOC-XXXXXX`

#### Table: `patients` (extends `AuditableEntity`)
*   `user_id`: `bigint` (PRIMARY KEY, FOREIGN KEY → `users.id`)
*   `unique_id`: `varchar(20)` (UNIQUE) - Format: `PAT-XXXXXX`
*   `full_name`: `varchar(150)` (NOT NULL)
*   `dob`: `date`
*   `age_years`: `integer`
*   `gender`: `varchar(20)`
*   `city`: `varchar(100)`
*   `referred_by`: `varchar(150)`
*   `allergies`: `text`
*   `medical_history`: `text`
*   `primary_complaint`: `text`
*   `id_insurance_file_path`: `varchar(255)`
*   `past_reports_file_path`: `varchar(255)`

#### Table: `service_providers` (extends `AuditableEntity`)
*   `user_id`: `bigint` (PRIMARY KEY, FOREIGN KEY → `users.id`)
*   `provider_name`: `varchar(200)` (NOT NULL)
*   `provider_type`: `varchar(50)` (NOT NULL)
*   `address`: `varchar(500)`
*   `mobile`: `varchar(20)`
*   `service_metadata`: `text`
*   `unique_id`: `varchar(20)` (NOT NULL, UNIQUE) - Format: `SP-XXXXXX`

---

### Mappings & Associations

#### Table: `doctor_org_mappings`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `doctor_id`: `bigint` (FOREIGN KEY → `doctors.user_id`, NOT NULL)
*   `org_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`, NOT NULL)
*   `status`: `varchar(30)` (NOT NULL) - `PENDING`, `ACTIVE`, `INACTIVE`
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id`: `bigint`
*   *Constraint:* UNIQUE(`doctor_id`, `org_id`)

#### Table: `patient_org_mappings`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `patient_id`: `bigint` (FOREIGN KEY → `patients.user_id`, NOT NULL)
*   `org_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`, NOT NULL)
*   `status`: `varchar(30)` (NOT NULL) - `ACTIVE`, `INACTIVE`
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id`: `bigint`
*   *Constraint:* UNIQUE(`patient_id`, `org_id`)

#### Table: `patient_doctor_mappings`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `patient_id`: `bigint` (FOREIGN KEY → `patients.user_id`, NOT NULL)
*   `doctor_id`: `bigint` (FOREIGN KEY → `doctors.user_id`, NOT NULL)
*   `status`: `varchar(30)` (NOT NULL) - `ACTIVE`, `INACTIVE`, `PENDING`
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id`: `bigint`
*   *Constraint:* UNIQUE(`patient_id`, `doctor_id`)

#### Table: `patient_lab_mappings`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `patient_id`: `bigint` (FOREIGN KEY → `patients.user_id`, NOT NULL)
*   `lab_id`: `bigint` (FOREIGN KEY → `service_providers.user_id`, NOT NULL)
*   `status`: `varchar(30)` (NOT NULL) - `ACTIVE`, `INACTIVE`, `PENDING`
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id`: `bigint`
*   *Constraint:* UNIQUE(`patient_id`, `lab_id`)

#### Table: `service_provider_org_mappings`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `service_provider_id`: `bigint` (FOREIGN KEY → `service_providers.user_id`, NOT NULL)
*   `org_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`, NOT NULL)
*   `status`: `varchar(30)` (NOT NULL) - `PENDING`, `ACTIVE`, `INACTIVE`
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id`: `bigint`
*   *Constraint:* UNIQUE(`service_provider_id`, `org_id`)

---

### Core Clinic Flow Data

#### Table: `appointments`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `patient_user_id`: `bigint` (FOREIGN KEY → `patients.user_id`)
*   `doctor_user_id`: `bigint` (FOREIGN KEY → `doctors.user_id`)
*   `visit_id`: `bigint` (FOREIGN KEY → `visits.id`, OPTIONAL)
*   `appointment_date`: `date` (NOT NULL)
*   `start_time`: `time` (NOT NULL)
*   `end_time`: `time`
*   `status`: `varchar(30)` (NOT NULL, DEFAULT 'BOOKED')
*   `reason`: `varchar(255)`
*   `notes`: `text`
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id`: `bigint`
*   `org_user_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`)

#### Table: `visits`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `patient_user_id`: `bigint` (FOREIGN KEY → `patients.user_id`, NOT NULL)
*   `doctor_user_id`: `bigint` (FOREIGN KEY → `doctors.user_id`)
*   `visit_date`: `timestamp` (NOT NULL)
*   `visit_type`: `varchar(30)` - `NEW`, `FOLLOWUP`, `EMERGENCY`
*   `chief_complaint`: `text`
*   `notes`: `text`
*   `status`: `varchar(30)` (NOT NULL, DEFAULT 'OPEN')
*   `odo_mode`: `varchar(20)` - `adult` or `child`
*   `odo_teeth_json`: `text` - Comma-separated or JSON list of teeth
*   `diag_free_text`: `text`
*   `diag_final_text`: `text`
*   `diag_report_type`: `varchar(50)`
*   `diag_report_note`: `text`
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id`: `bigint`
*   `org_user_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`)

#### Table: `visit_examination_items`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `visit_id`: `bigint` (FOREIGN KEY → `visits.id`, NOT NULL)
*   `exam_item_id`: `bigint` (FOREIGN KEY → `exam_items_master.id`)
*   `section`: `varchar(100)` (NOT NULL)
*   `item_key`: `varchar(100)` (NOT NULL)
*   `label`: `varchar(150)` (NOT NULL)
*   `description`: `text`
*   `is_abnormal`: `boolean` (NOT NULL, DEFAULT true)
*   `vitals_json`: `text`
*   `general_notes`: `text`
*   `created_at` / `updated_at`: `timestamp`

#### Table: `exam_items_master`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `item_key`: `varchar(50)` (NOT NULL, UNIQUE)
*   `title`: `varchar(200)` (NOT NULL)
*   `default_text`: `text`
*   `display_order`: `integer` (NOT NULL, DEFAULT 0)
*   `is_active`: `boolean` (NOT NULL, DEFAULT true)
*   `created_at` / `updated_at`: `timestamp`

---

### Treatment Master & Plan Data

#### Table: `treatment_categories_master`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `category_key`: `varchar(50)` (NOT NULL, UNIQUE)
*   `title`: `varchar(200)` (NOT NULL)
*   `display_order`: `integer` (NOT NULL, DEFAULT 0)
*   `is_active`: `boolean` (NOT NULL, DEFAULT true)
*   `created_at` / `updated_at`: `timestamp`

#### Table: `treatment_procedures_master`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `category_id`: `bigint` (FOREIGN KEY → `treatment_categories_master.id`, NOT NULL)
*   `name`: `varchar(200)` (NOT NULL)
*   `consent_text`: `text`
*   `guideline_text`: `text`
*   `is_active`: `boolean` (NOT NULL, DEFAULT true)
*   `display_order`: `integer` (NOT NULL, DEFAULT 0)
*   `created_at` / `updated_at`: `timestamp`
*   *Constraint:* UNIQUE(`category_id`, `name`)

#### Table: `visit_treatments`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `visit_id`: `bigint` (FOREIGN KEY → `visits.id`, NOT NULL)
*   `procedure_id`: `bigint` (FOREIGN KEY → `treatment_procedures_master.id`)
*   `plan_date`: `date` (NOT NULL)
*   `status`: `varchar(30)` (NOT NULL, DEFAULT 'PLANNED')
*   `description`: `varchar(200)` (NOT NULL)
*   `tooth_code`: `varchar(10)`
*   `quantity`: `integer` (NOT NULL, DEFAULT 1)
*   `unit_price`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `discount_amount`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `net_amount`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `remarks`: `text`
*   `created_at` / `updated_at`: `timestamp`

#### Table: `visit_treatment_items`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `visit_id`: `bigint` (FOREIGN KEY → `visits.id`, NOT NULL)
*   `category_key`: `varchar(100)`
*   `category_title`: `varchar(200)`
*   `procedure_name`: `varchar(200)`
*   `notes`: `text`
*   `odontogram_mode`: `varchar(20)`
*   `selected_teeth_json`: `text`
*   `extras_json`: `text`
*   `price`: `double precision`
*   `created_at` / `updated_at`: `timestamp`

---

### Prescriptions (Rx)

#### Table: `prescriptions`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `visit_id`: `bigint` (FOREIGN KEY → `visits.id`, NOT NULL)
*   `patient_user_id`: `bigint` (FOREIGN KEY → `patients.user_id`, NOT NULL)
*   `doctor_user_id`: `bigint` (FOREIGN KEY → `doctors.user_id`, NOT NULL)
*   `rx_date`: `date` (NOT NULL)
*   `notes`: `text`
*   `created_at`: `timestamp`
*   `org_user_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`)

#### Table: `prescription_items`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `prescription_id`: `bigint` (FOREIGN KEY → `prescriptions.id`, NOT NULL)
*   `medicine_name`: `varchar(200)` (NOT NULL)
*   `medicine_contents`: `varchar(100)`
*   `medicine_type`: `varchar(100)` (NOT NULL)
*   `volume`: `varchar(100)` (NOT NULL)
*   `dose`: `varchar(100)` (NOT NULL)
*   `days`: `varchar(100)`
*   `timings`: `varchar(100)`
*   `duration`: `varchar(50)`
*   `instructions`: `varchar(255)`
*   `created_at`: `timestamp`

#### Table: `prescription_templates`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `name`: `varchar(200)` (NOT NULL)
*   `medicine_name`: `varchar(200)` (NOT NULL)
*   `medicine_contents`: `varchar(255)`
*   `medicine_type`: `varchar(100)` (NOT NULL)
*   `volume`: `varchar(100)` (NOT NULL)
*   `dose`: `varchar(100)` (NOT NULL)
*   `days`: `varchar(100)`
*   `timings`: `varchar(100)`
*   `duration`: `varchar(50)`
*   `instructions`: `varchar(255)`
*   `doctor_user_id`: `bigint` (FOREIGN KEY → `doctors.user_id`)
*   `created_at`: `timestamp`

---

### Billing & Payments

#### Table: `bills`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `visit_id`: `bigint` (FOREIGN KEY → `visits.id`, NOT NULL)
*   `patient_user_id`: `bigint` (FOREIGN KEY → `patients.user_id`, NOT NULL)
*   `doctor_user_id`: `bigint` (FOREIGN KEY → `doctors.user_id`)
*   `bill_no`: `varchar(50)` (NOT NULL, UNIQUE)
*   `bill_date`: `timestamp` (NOT NULL)
*   `gross_amount`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `discount_amount`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `tax_amount`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `net_amount`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `status`: `varchar(30)` (NOT NULL, DEFAULT 'UNPAID')
*   `remarks`: `text`
*   `created_at` / `updated_at`: `timestamp`
*   `created_by_user_id`: `bigint`
*   `org_user_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`)

#### Table: `bill_items`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `bill_id`: `bigint` (FOREIGN KEY → `bills.id`, NOT NULL)
*   `item_type`: `varchar(30)` (NOT NULL) - `SERVICE`, `PROCEDURE`, `MEDICINE`, `OTHER`
*   `ref_id`: `bigint` (References execution item ID, e.g. visit treatment)
*   `description`: `varchar(200)` (NOT NULL)
*   `quantity`: `numeric(10, 2)` (NOT NULL, DEFAULT 1.0)
*   `rate`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `tax_percent`: `numeric(5, 2)` (NOT NULL, DEFAULT 0.0)
*   `line_total`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `created_at`: `timestamp`

#### Table: `bill_payments`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `bill_id`: `bigint` (FOREIGN KEY → `bills.id`, NOT NULL)
*   `payment_date`: `timestamp` (NOT NULL)
*   `amount`: `numeric(19, 2)` (NOT NULL)
*   `method`: `varchar(50)` (NOT NULL) - `CASH`, `CARD`, `UPI`, `NEFT`, `CHEQUE`
*   `reference_no`: `varchar(100)`
*   `notes`: `varchar(255)`
*   `created_at`: `timestamp`

---

### Inventory & Vendors

#### Table: `vendors`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `name`: `varchar(200)` (NOT NULL)
*   `address`: `varchar(500)`
*   `mobile`: `varchar(20)`
*   `category`: `varchar(50)` - `consumable`, `non-consumable`, `medicine`, `other`
*   `gst_no`: `varchar(30)`
*   `is_active`: `boolean` (NOT NULL, DEFAULT true)
*   `created_at` / `updated_at`: `timestamp`
*   `org_user_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`)

#### Table: `inventory_items`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `item_code`: `varchar(50)` (NOT NULL, UNIQUE)
*   `name`: `varchar(200)` (NOT NULL)
*   `category`: `varchar(50)` (NOT NULL)
*   `unit`: `varchar(50)` (NOT NULL)
*   `opening_stock`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `current_stock`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `reorder_level`: `numeric(19, 2)` (NOT NULL, DEFAULT 0.0)
*   `hsn_code`: `varchar(30)`
*   `gst_percent`: `numeric(5, 2)` (NOT NULL, DEFAULT 0.0)
*   `is_active`: `boolean` (NOT NULL, DEFAULT true)
*   `vendor_name`: `varchar(200)`
*   `vendor_id`: `bigint` (FOREIGN KEY → `vendors.id`, OPTIONAL)
*   `unit_price`: `numeric(10, 2)`
*   `location`: `varchar(100)`
*   `notes`: `varchar(500)`
*   `created_at` / `updated_at`: `timestamp`
*   `org_user_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`)

#### Table: `inventory_movements`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `item_id`: `bigint` (FOREIGN KEY → `inventory_items.id`, NOT NULL)
*   `movement_date`: `date` (NOT NULL)
*   `movement_time`: `timestamp` (NOT NULL)
*   `movement_type`: `varchar(30)` (NOT NULL)
*   `quantity`: `numeric(19, 2)` (NOT NULL)
*   `direction`: `varchar(5)` (NOT NULL) - `IN` / `OUT`
*   `balance_after`: `numeric(19, 2)` (NOT NULL)
*   `source_type`: `varchar(30)`
*   `source_id`: `bigint`
*   `visit_id`: `bigint` (FOREIGN KEY → `visits.id`)
*   `visit_treatment_id`: `bigint` (FOREIGN KEY → `visit_treatments.id`)
*   `notes`: `varchar(255)`
*   `created_by`: `bigint` (FOREIGN KEY → `users.id`)
*   `created_at`: `timestamp` (NOT NULL)

#### Table: `treatment_inventory_templates`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `procedure_id`: `bigint` (FOREIGN KEY → `treatment_procedures_master.id`, NOT NULL)
*   `item_id`: `bigint` (FOREIGN KEY → `inventory_items.id`, NOT NULL)
*   `quantity_per_procedure`: `numeric(10, 3)` (NOT NULL, DEFAULT 0.0)
*   `unit`: `varchar(50)` (NOT NULL)
*   `is_active`: `boolean` (NOT NULL, DEFAULT true)
*   `notes`: `varchar(255)`
*   `created_at` / `updated_at`: `timestamp`

#### Table: `inventory_treatment_templates`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `name`: `varchar(200)` (NOT NULL)
*   `created_at` / `updated_at`: `timestamp`

#### Table: `inventory_treatment_template_rows`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `template_id`: `bigint` (FOREIGN KEY → `inventory_treatment_templates.id`, NOT NULL)
*   `item_id`: `bigint` (FOREIGN KEY → `inventory_items.id`, NOT NULL)
*   `qty_per_treatment`: `numeric(10, 3)` (NOT NULL)

---

### Internal Chat & Lab

#### Table: `labs`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `name`: `varchar(200)` (NOT NULL)
*   `address`: `varchar(500)`
*   `mobile`: `varchar(20)`
*   `created_at` / `updated_at`: `timestamp`
*   `org_user_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`)

#### Table: `chat_threads`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `type`: `varchar(30)` (NOT NULL)
*   `patient_user_id`: `bigint` (FOREIGN KEY → `patients.user_id`)
*   `doctor_user_id`: `bigint` (FOREIGN KEY → `doctors.user_id`)
*   `org_user_id`: `bigint` (FOREIGN KEY → `org_hospitals.user_id`)
*   `created_at` / `updated_at`: `timestamp`

#### Table: `chat_attachments`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `uploaded_by_user_id`: `bigint` (FOREIGN KEY → `users.id`)
*   `file_name`: `varchar(255)` (NOT NULL)
*   `content_type`: `varchar(120)`
*   `file_size`: `bigint`
*   `storage_path`: `varchar(500)` (NOT NULL)
*   `created_at`: `timestamp` (NOT NULL)

#### Table: `chat_messages`
*   `id`: `bigint` (PRIMARY KEY, IDENTITY)
*   `thread_id`: `bigint` (FOREIGN KEY → `chat_threads.id`, NOT NULL)
*   `sender_user_id`: `bigint` (FOREIGN KEY → `users.id`, NOT NULL)
*   `receiver_user_id`: `bigint` (FOREIGN KEY → `users.id`)
*   `content`: `text`
*   `message_type`: `varchar(20)`
*   `attachment_id`: `bigint` (FOREIGN KEY → `chat_attachments.id`)
*   `attachment_ids`: `varchar(1000)`
*   `is_read`: `boolean` (NOT NULL, DEFAULT false)
*   `created_at`: `timestamp` (NOT NULL)

---

## 8. Frontend Navigation & Routing Mapping

The core routing controls reside within `UnifiedDashboard.jsx` which wraps the entire workspace in `WowDashLayout`. Below is how screens map to user configurations:

| Sidebar Navigation Label | Target Path | Module Guard | Allowed Roles |
| :--- | :--- | :--- | :--- |
| **Overview** | `/dashboard/overview` | *Always Visible* | All Roles (custom panels render per role) |
| **Organizations** | `/dashboard/organizations` | *None* | `SUPERADMIN`, `SUPER_ADMIN` |
| **Doctors** | `/dashboard/doctors` | *None* | `SUPERADMIN`, `SUPER_ADMIN` |
| **Patients** | `/dashboard/patients-admin`| *None* | `SUPERADMIN`, `SUPER_ADMIN` |
| **Service Providers** | `/dashboard/service-providers` | *None* | `SUPERADMIN`, `SUPER_ADMIN` |
| **Patient Entry** | `/dashboard/patients` | `PATIENTS` | `ORG`, `DOCTOR` |
| **Doctor Entry** | `/dashboard/doctor` | `PATIENTS` | `ORG` |
| **Lab Entry** | `/dashboard/lab` | `PATIENTS` | `ORG` |
| **Vendor Entry** | `/dashboard/vendor` | `PATIENTS` | `ORG` |
| **Dental Care** | `/dashboard/dental-care` | `PATIENTS` | `DOCTOR` |
| **Appointments** | `/dashboard/appointments` | `APPOINTMENTS` | `ORG`, `DOCTOR` |
| **Prescriptions** | `/dashboard/rx` | `APPOINTMENTS` | `ORG`, `DOCTOR` |
| **Consent & Guide** | `/dashboard/consent` | `APPOINTMENTS` | `ORG`, `DOCTOR` |
| **Billing** | `/dashboard/billing` | `BILLING_FINANCE` | `ORG` |
| **Reports** | `/dashboard/reports` | `BILLING_FINANCE` | `ORG` |
| **Inventory** | `/dashboard/inventory` | `INVENTORY` | `ORG` |
| **User Manager** | `/dashboard/users` | `USER_MANAGEMENT` | `ORG` |
| **Chat Support** | `/dashboard/chat` | *Role Dependent* | All Roles (excluding Super Admins) |
| **My Schedule** | `/dashboard/patient-schedule` | *None* | `PATIENT` |
| **Prescriptions** | `/dashboard/rx` | *None* | `PATIENT` (PatientReportsPage) |
| **Billing & Invoices**| `/dashboard/billing` | *None* | `PATIENT` (PatientBillingPage) |
| **My Documents** | `/dashboard/consent` | *None* | `PATIENT` (PatientDocumentsPage) |
| **Lab Orders** | `/dashboard/lab-orders` | `LAB_ORDERS_MODULE` | `SERVICE_PROVIDER` (if type matches) |
| **Beds Allocation** | `/dashboard/beds` | `BED_ALLOCATION_MODULE`| `SERVICE_PROVIDER` (if type matches) |
| **Pharmacy Orders** | `/dashboard/pharmacy-orders` | `PHARMACY_ORDERS_MODULE`| `SERVICE_PROVIDER` (if type matches)|
| **Radiology Portal** | `/dashboard/radiology` | `RADIOLOGY_MODULE` | `SERVICE_PROVIDER` (if type matches) |
| **Pathology Portal** | `/dashboard/pathology` | `PATHOLOGY_MODULE` | `SERVICE_PROVIDER` (if type matches) |
| **Blood Bank** | `/dashboard/blood-bank` | `BLOOD_BANK_MODULE`| `SERVICE_PROVIDER` (if type matches) |
| **Ambulance Dispatch**| `/dashboard/ambulance` | `AMBULANCE_MODULE`| `SERVICE_PROVIDER` (if type matches) |
| **Orthodontic Orders**| `/dashboard/orthodontic-lab`| `ORTHODONTIC_LAB_MODULE`| `SERVICE_PROVIDER` (if type matches)|
