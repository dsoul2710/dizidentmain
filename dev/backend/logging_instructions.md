# Centralized Logging and Tracing Guidelines

This document describes how to perform trace-correlated logging in the **DiziDental Clinic Dashboard** backend.

---

## 1. Using `@Slf4j` for Logging

Lombok's `@Slf4j` is the standard logging facade used across the application. When you add `@Slf4j` at the class level, Lombok generates a compile-time static logger named `log`.

### Correct Logging Practices
* **Placeholders over string concatenation**: Always use `{}` placeholders for logging variables. It avoids string allocation overhead when the log level is disabled.
  ```java
  // Good:
  log.info("Processing billing record for patient ID: {} in clinic: {}", patientId, clinicId);

  // Avoid:
  log.info("Processing billing record for patient ID: " + patientId + " in clinic: " + clinicId);
  ```
* **Logging exceptions with stack traces**: To log a stack trace, pass the exception object as the *last argument* to `log.error()`. Do not use placeholders for the exception.
  ```java
  // Good:
  log.error("Failed to sync module permissions for user: {}", userId, ex);

  // Avoid (this discards the stack trace):
  log.error("Failed to sync permissions: {}", ex.getMessage());
  ```

---

## 2. Distributed Tracing & MDC Correlation

Every HTTP request entering the backend is intercepted by the `MdcLoggingFilter`. 

1. **Header Inspection**: It extracts the correlation ID from incoming headers (`X-Correlation-Id` or `traceparent`). If none is found, a new UUID is generated.
2. **Context Binding**: The ID is bound to the thread-local **Mapped Diagnostic Context (MDC)** using the key `"traceId"`.
3. **Automatic Log Enrichment**: All logs printed by the active thread using `log.info()`, `log.warn()`, or `log.error()` will automatically include the correlation ID.
4. **Header Return**: The correlation ID is sent back to the frontend in the `X-Correlation-Id` response header.

---

## 3. Logback Profiles & Output Formats

Logging output and patterns are configured in `logback-spring.xml` based on Spring active profiles.

### Development (`dev` profile)
- **Output**: Console (`STDOUT`).
- **Format**: Colorized and human-readable.
- **Pattern**: `[traceId=xxxx-xxxx-xxxx]` tags are appended to every log line to trace a request trace end-to-end.
- **Level**: Package `com.clinic.hms` logs at `DEBUG` level.

### Production (`prod` or non-dev profile)
- **Output**: Console + Rolling Files.
- **File Location**: `logs/clinic-hms.log` (archived files rollover daily or when file size exceeds 10MB in `logs/archived/`).
- **Format**: Standard clean logs suitable for Logstash, Datadog, or Grafana Loki ingestion.
- **Level**: Root and application logs at `INFO` level.

---

## 4. Uncaught Exception Response Structure

The `GlobalExceptionHandler` intercepts all unhandled REST exceptions and maps them into a standard JSON payload that includes the active `traceId`:

```json
{
  "timestamp": "2026-06-20T20:25:00.123",
  "status": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred. Please contact support and reference the trace ID.",
  "path": "/api/service-providers/8",
  "traceId": "c88f1728-10b2-4d2c-8df2-e56a789bc101"
}
```
*Users or clients facing errors can report this `traceId` to the clinic administrator to immediately pinpoint the corresponding stack trace in the backend logs.*
