# Technology Stack

## Programming Languages
- **Java** 21 — Backend application code
- **JavaScript (JSX)** — Frontend React components

## Frameworks
| Framework | Version | Purpose |
|-----------|---------|---------|
| Spring Boot | 4.0.0 | Backend API, JPA, Security, WebSocket |
| Spring Data JPA | (Boot managed) | Persistence |
| Spring Security | (Boot managed) | Auth filter chain |
| React | 19.x | Frontend UI |
| Vite | 7.x | Frontend build/dev server |
| React Router | 7.x | Client routing |

## Infrastructure
- **PostgreSQL** 16 — Primary database (Docker)
- **Docker Compose** — Local dev orchestration
- **nginx** — Frontend production container serve

## Build Tools
- **Gradle** — Backend build (`bootJar`, tests)
- **npm** — Frontend dependencies and scripts

## Testing Tools
- **JUnit 5** — Backend (minimal usage today)
- **ESLint** — Frontend static analysis

## API Documentation
- **springdoc-openapi** 2.8.x — Swagger UI at `/swagger-ui.html`

## Real-time
- **STOMP + SockJS** — Chat WebSocket (`@stomp/stompjs`, `sockjs-client`)
