# NFR Requirements — unit-frontend-restructure

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-U4-01 | Production build succeeds | `npm run build` exit 0 | Pass |
| NFR-U4-02 | Route paths unchanged | All `/dashboard/*`, `/login` preserved | Pass |
| NFR-U4-03 | WowDash UI preserved | No visual refactor | Pass |
| NFR-U4-04 | XSS baseline | No `dangerouslySetInnerHTML` added | Pass |
| NFR-U4-05 | Session handling | Cookie JWT via axios `withCredentials`; localStorage partial defer | Unchanged |
| NFR-U4-06 | ESLint | `npm run lint` — pre-existing vendor/hook warnings remain | See note |

**Lint note:** ESLint reports ~119 issues, mostly pre-existing (vendor JS in `public/`, react-hooks rules). Build gate passes; full lint cleanup out of U4 scope.
