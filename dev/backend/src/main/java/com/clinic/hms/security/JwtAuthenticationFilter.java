package com.clinic.hms.security;

import com.clinic.hms.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    @Value("${app.auth.legacy-enabled:true}")
    private boolean legacyAuthEnabled;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!legacyAuthEnabled) {
            return true;
        }
        String authHeader = request.getHeader("Authorization");
        return authHeader != null && authHeader.startsWith("Bearer ");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractTokenFromCookies(request.getCookies());

        if (token != null && jwtUtil.validateToken(token)
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            String username = jwtUtil.getUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

            SecurityContextHolder.getContext().setAuthentication(authToken);
        } else if (token != null && !jwtUtil.validateToken(token)) {
            org.slf4j.LoggerFactory.getLogger(JwtAuthenticationFilter.class)
                    .warn("Invalid or expired JWT cookie on {}", request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromCookies(Cookie[] cookies) {
        if (cookies == null) return null;
        return Arrays.stream(cookies)
                .filter(c -> "hms_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
