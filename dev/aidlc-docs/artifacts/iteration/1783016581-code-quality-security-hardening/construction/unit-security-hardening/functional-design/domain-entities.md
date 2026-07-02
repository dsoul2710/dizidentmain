# Domain Entities — unit-security-hardening

Entities and value objects touched by the security hardening unit.

---

## Primary Entities

### User

| Field | Type | Security notes |
|-------|------|----------------|
| id | Long | JWT subject reference |
| mobile | String | Login username; unique |
| password | String | Stored hash; BCrypt after migration |
| role | UserRole | Maps to `ROLE_*` authority |
| isActive | Boolean | Login gate |
| updatedAt | LocalDateTime | Updated on login |

**Relationships**: One User links to role-specific profile (Patient, Doctor, etc.) by shared id.

### ModulePermission

| Field | Type | Notes |
|-------|------|-------|
| user | User | FK |
| moduleName | String | e.g. BILLING_FINANCE |
| canView | Boolean | |
| canEdit | Boolean | |
| canDelete | Boolean | |

**Lifecycle**: Bootstrapped at first login if empty set.

---

## Role Profile Entities (read-only at login)

Used for display name resolution in `AuthService`:

| Entity | Role | Name field |
|--------|------|------------|
| Patient | PATIENT | fullName |
| Doctor | DOCTOR | fullName |
| OrgHospital | ORG_HOSPITAL | orgName |
| ServiceProvider | SERVICE_PROVIDER | providerName, providerType(s) |
| SuperAdmin | SUPER_ADMIN | fullName |

---

## Org Mapping Entities (org scoping)

| Entity | Purpose |
|--------|---------|
| DoctorOrgMapping | Doctor ↔ Org (status ACTIVE) |
| ServiceProviderOrgMapping | SP ↔ Org |
| PatientOrgMapping | Patient ↔ Org |

Used by `SecurityUtils` / `OrgContextService` for `X-Active-Org-Id` validation.

---

## Value Objects / DTOs

### LoginRequest

| Field | Validation |
|-------|------------|
| mobile | Not blank, pattern if applicable |
| password | Not blank |

### LoginResponse

| Field | Type | Frontend use |
|-------|------|--------------|
| id | Long | User id |
| mobile | String | |
| role | String | Route/dashboard selection |
| name | String | Display |
| providerType | String | Nullable |
| providerTypes | Set String | Nullable |
| permissions | List ModulePermissionResponse | Module gating |

**Contract**: MUST NOT change field names or structure (FR-13).

### ModulePermissionResponse

| Field | Type |
|-------|------|
| moduleName | String |
| canView | Boolean |
| canEdit | Boolean |
| canDelete | Boolean |

### UserSummaryResponse

| Field | Type |
|-------|------|
| id | Long |
| name | String |
| mobile | String |
| role | String |
| isActive | Boolean |

---

## Security Domain Objects (non-JPA)

### CustomUserDetails

- Wraps `User` for Spring Security
- Authorities: single `ROLE_{role}`
- Populated by `CustomUserDetailsService` after JWT validation

### JWT Token (logical)

| Claim | Source |
|-------|--------|
| subject | mobile |
| userId | custom claim |
| role | custom claim |
| exp | 1 hour from issue |

### AuthenticatedUser (service internal — optional)

Proposed internal DTO for `AuthService.authenticate()`:

| Field | Type |
|-------|------|
| user | User |
| permissions | List ModulePermissionResponse |
| displayName | String |
| providerType | String |
| providerTypes | Set String |

---

## Entity Relationship (security context)

```text
User 1──* ModulePermission
User 1──0..1 Patient|Doctor|OrgHospital|ServiceProvider|SuperAdmin  (by shared id)
Doctor *──* OrgHospital  (via DoctorOrgMapping)
ServiceProvider *──* OrgHospital  (via ServiceProviderOrgMapping)
Patient *──* OrgHospital  (via PatientOrgMapping)
```

---

## New Service Components (logical, not JPA)

| Component | Responsibility |
|-----------|----------------|
| AuthService | Login orchestration, permission bootstrap |
| UserService | User list, permission queries |
| OrgContextService | Org ID resolution facade over SecurityUtils |

---

## Data Persistence Boundaries

| Operation | Transaction |
|-----------|-------------|
| Login + password rehash + permission bootstrap | Single `@Transactional` |
| JWT validation | Read-only |
| User list | Read-only |

---

## Entities NOT modified in U1

- Clinical entities (Visit, Appointment, Bill, etc.)
- Schema unchanged — password column stores encoded string only
