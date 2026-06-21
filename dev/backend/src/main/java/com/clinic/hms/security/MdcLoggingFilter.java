package com.clinic.hms.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Slf4j
public class MdcLoggingFilter extends OncePerRequestFilter {

    private static final String MDC_TRACE_ID_KEY = "traceId";
    private static final String CORRELATION_HEADER = "X-Correlation-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        long startTime = System.currentTimeMillis();

        // 1. Resolve or generate Trace/Correlation ID
        String traceId = request.getHeader(CORRELATION_HEADER);
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader("X-Trace-Id");
        }
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader("traceparent"); // W3C format
        }
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
        }

        // 2. Bind to MDC context
        MDC.put(MDC_TRACE_ID_KEY, traceId);

        // 3. Inject correlation ID into HTTP response headers
        response.setHeader(CORRELATION_HEADER, traceId);

        // Log request receipt
        String uri = request.getRequestURI();
        String method = request.getMethod();
        String queryString = request.getQueryString();
        String clientIp = request.getRemoteAddr();
        
        if (queryString != null) {
            log.info("Received request: {} {}?{} from IP: {}", method, uri, queryString, clientIp);
        } else {
            log.info("Received request: {} {} from IP: {}", method, uri, clientIp);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Log response performance metrics
            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            
            log.info("Response sent: {} {} - Status: {} - Duration: {}ms", method, uri, status, duration);

            // 4. Clean up thread-local MDC context to prevent resource leaks
            MDC.clear();
        }
    }
}
