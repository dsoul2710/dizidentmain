# Code Generation Plan — unit-security-hardening

**Unit:** U1 | **Traceability:** FR-1.*, SEC-001–003

## Steps

- [x] Step 1: Add security properties to `application.properties`
- [x] Step 2: Create `LegacyCompatiblePasswordEncoder`
- [x] Step 3: Create `JsonAuthenticationEntryPoint` and `JsonAccessDeniedHandler`
- [x] Step 4: Extract `ErrorResponse` for shared JSON errors
- [x] Step 5: Update `GlobalExceptionHandler` (auth exceptions)
- [x] Step 6: Update `SecurityConfig` (auth, CORS, method security)
- [x] Step 7: Create `AuthService`, `UserService`, `OrgContextService`
- [x] Step 8: Refactor `AuthController` and `UserController`
- [x] Step 9: Add validation to `LoginRequest`
- [x] Step 10: Update `JwtAuthenticationFilter` (warn on invalid token)
- [x] Step 11: Add `spring-security-test` and unit tests
- [x] Step 12: Run `./gradlew test` — BUILD SUCCESSFUL
- [x] Step 13: Write code summary
