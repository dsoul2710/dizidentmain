# API Documentation (Summary)

Full interactive docs: `http://localhost:8080/swagger-ui.html` (when backend running).

## Auth

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Mobile + password login, sets JWT cookie |

## Core domains (representative)

| Domain | Base path | Controller |
|--------|-----------|------------|
| Patients | `/api/patients` | PatientController |
| Visits | `/api/visits` | VisitController |
| Appointments | `/api/appointments` | AppointmentController |
| Billing | `/api/billing` | BillingController |
| Prescriptions | `/api/prescriptions` | PrescriptionController |
| Inventory | `/api/inventory` | InventoryController |
| Labs | `/api/labs` | LabController |
| Chat | `/api/chat` | ChatController |
| Doctors | `/api/doctors` | DoctorController |
| Organizations | `/api/organizations` | OrganizationController |

## WebSocket

- STOMP endpoint for chat messaging (ChatWebSocketController)

## Common headers

- `X-Active-Org-Id` — Organization context (set by frontend Axios interceptor)
- Cookie — JWT token (HTTP-only, from login)

## Data models

JPA entities in `entity/` with DTOs in `dto/request/` and `dto/response/`. See knowledge graph for full relationship map.

**Security note:** As of reverse engineering, Spring Security permits all `/api/**` without authentication — endpoints are effectively public until SEC-001 is fixed.
