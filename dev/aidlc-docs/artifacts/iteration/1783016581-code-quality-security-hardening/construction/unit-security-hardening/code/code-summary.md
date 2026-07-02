# Code Summary — unit-security-hardening

## SEC findings addressed

| ID | Status | Change |
|----|--------|--------|
| SEC-001 | Fixed | `/api/**` requires authentication except login, logout, health, swagger |
| SEC-002 | Fixed | `LegacyCompatiblePasswordEncoder` + BCrypt migrate-on-login |
| SEC-003 | Fixed | CORS explicit allowlist via `app.cors.allowed-origins` |
| SEC-004 | Deferred | Swagger still public — ticket for U2 |

## Files created

| File | Purpose |
|------|---------|
| `security/LegacyCompatiblePasswordEncoder.java` | BCrypt + legacy plain-text support |
| `security/JsonAuthenticationEntryPoint.java` | 401 JSON errors |
| `security/JsonAccessDeniedHandler.java` | 403 JSON errors |
| `service/AuthService.java` | Login/logout orchestration |
| `service/UserService.java` | User admin operations |
| `service/OrgContextService.java` | Org scoping facade |
| `exception/ErrorResponse.java` | Shared error DTO |
| `exception/InvalidCredentialsException.java` | 401 login failures |
| `exception/InactiveUserException.java` | 403 inactive user |
| `test/.../LegacyCompatiblePasswordEncoderTest.java` | Password encoder tests |
| `test/.../AuthServiceTest.java` | Migrate-on-login test |

## Files modified

| File | Change |
|------|--------|
| `security/SecurityConfig.java` | Auth rules, CORS allowlist, `@EnableMethodSecurity` |
| `security/JwtAuthenticationFilter.java` | Warn on invalid JWT |
| `controller/AuthController.java` | Thin delegate to AuthService |
| `controller/UserController.java` | `@PreAuthorize` + UserService |
| `exception/GlobalExceptionHandler.java` | Auth exception handlers |
| `dto/request/LoginRequest.java` | `@Valid` constraints |
| `application.properties` | CORS + cookie secure props |
| `build.gradle` | `spring-security-test` |

## Configuration

```properties
app.cors.allowed-origins=${APP_CORS_ALLOWED_ORIGINS:http://localhost:5173,...}
app.security.cookie-secure=${APP_SECURITY_COOKIE_SECURE:false}
```

## Verification

- `./gradlew test` — BUILD SUCCESSFUL (6 tests including new auth tests)

## Manual smoke test (recommended)

1. Start backend + frontend
2. Login via UI — should succeed with existing users
3. Call `GET /api/users` without cookie — expect 401
4. Second login with same user — password stored as `{bcrypt}...`

## Notes

- `/ws/**` remains `permitAll` until U2 WebSocket auth alignment
- Other controllers require JWT but role checks expanded in U2 audit
- JWT default secret still in properties for dev — set `JWT_SECRET` for production
