package com.healthcare.doctor.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

// Defines HTTP security, CORS policy and JWT filter wiring for the Doctor microservice.
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    // Injected JWT filter that validates Bearer tokens on every request.
    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Apply the CORS configuration defined in corsConfigurationSource().
                .cors(Customizer.withDefaults())
                // CSRF protection is unnecessary for stateless REST APIs that use JWT instead of cookies.
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                    // Public read-only endpoints (e.g., fetching a doctor's profile by ID) require no authentication.
                    .requestMatchers(HttpMethod.GET, "/api/doctors/public/**").permitAll()
                        // Internal service-to-service notification endpoint (no JWT needed)
                        // Called by the appointment service after a payment is confirmed.
                        .requestMatchers(HttpMethod.POST, "/api/doctors/appointments/internal/**").permitAll()
                        // Every other request must carry a valid Bearer token.
                        .anyRequest().authenticated()
                )
                // Use stateless sessions — no HttpSession is created or stored on the server.
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Register our JWT filter BEFORE Spring's built-in username/password filter so that
                // token-authenticated requests are set in the SecurityContext first.
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Allow requests only from the React dev server (Vite default ports).
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        ));
        // Permit all standard REST methods including OPTIONS for pre-flight requests.
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // Allow every header so that Authorization, Content-Type, etc. pass through freely.
        configuration.setAllowedHeaders(List.of("*"));
        // Required to allow the browser to send cookies / Authorization headers cross-origin.
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply this CORS configuration to all API paths.
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
