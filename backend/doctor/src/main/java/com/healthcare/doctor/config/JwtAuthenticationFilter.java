package com.healthcare.doctor.config;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

// OncePerRequestFilter guarantees this filter runs exactly once per HTTP request,
// even in forward/include dispatch scenarios.
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        // Read the Authorization header from the incoming HTTP request.
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        // If no Authorization header is present or it does not use the Bearer scheme,
        // pass the request along without setting an authentication context.
        // Spring Security will still enforce access rules (e.g., return 403 for protected endpoints).
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Strip the "Bearer " prefix (7 characters) to get the raw JWT string.
        jwt = authHeader.substring(7);

        try {
            // Extract the email address stored in the JWT's 'sub' claim.
            userEmail = jwtService.extractUsername(jwt);
        } catch (JwtException | IllegalArgumentException ex) {
            // Invalid/expired token: continue without authentication so Spring Security
            // returns 401/403 instead of a 500 error.
            filterChain.doFilter(request, response);
            return;
        }

        // Only set the authentication in the SecurityContext if the user was extracted
        // AND the context does not already hold a valid authentication (avoids overwriting).
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtService.isTokenValid(jwt)) {
                // Build a fully-authenticated token with empty authorities (roles come from the Auth service).
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userEmail,
                        null,        // credentials are not needed after JWT validation
                        new ArrayList<>()
                );
                // Attach request metadata (remote IP, session ID) to the authentication object.
                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                // Register the authentication so that downstream components (e.g., controllers)
                // can access it via SecurityContextHolder.getContext().getAuthentication().
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // Continue the filter chain regardless; Security rules are enforced by Spring later.
        filterChain.doFilter(request, response);
    }
}
