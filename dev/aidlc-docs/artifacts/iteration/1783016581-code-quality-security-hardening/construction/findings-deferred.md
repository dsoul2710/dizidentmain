# Deferred Findings — Follow-up Tickets

## U2-deferred-001 — Swagger auth (SEC-004)

- **Severity:** Medium
- **Description:** Swagger UI and `/v3/api-docs` remain publicly accessible
- **Target:** U2 follow-up or production profile restriction

## U2-deferred-002 — WebSocket JWT (AUD-M02)

- **Severity:** Medium
- **Description:** `/ws/**` permitAll in SecurityConfig; STOMP connections not JWT-validated
- **Target:** Align ChatWebSocketController with cookie JWT

## U2-deferred-003 — Chat IDOR review (AUD-M05)

- **Severity:** Medium
- **Description:** ChatController thread/attachment access needs caller membership check
- **Target:** ChatService authorization audit

## U2-deferred-004 — Clinical @PreAuthorize (AUD-M06)

- **Severity:** Medium
- **Description:** Patient/Visit/Billing controllers rely on JWT only without role annotations
- **Target:** Per-endpoint role matrix after org scoping verified

## U3-deferred-001 — Layering violations

- **Severity:** Low (structure)
- **Description:** 12 controllers inject repositories directly
- **Target:** unit-backend-layering
- **Status:** **Resolved** in U3 (2026-07-02)

## U4-deferred-001 — localStorage (SEC-006)

- **Severity:** Medium
- **Description:** Sensitive session data in localStorage
- **Target:** unit-frontend-restructure (partial)

## U1-deferred-001 — Login rate limiting

- **Severity:** Medium
- **Description:** No brute-force protection on login
- **Target:** Future security iteration
