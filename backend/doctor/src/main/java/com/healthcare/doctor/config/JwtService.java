package com.healthcare.doctor.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

// Utility service for parsing and validating JWT tokens issued by the Auth service.
@Service
public class JwtService {

    // Base64-encoded HMAC-SHA secret key; injected from application properties (jwt.secret).
    @Value("${jwt.secret}")
    private String secretKey;

    // Extract the 'sub' claim (subject), which stores the authenticated user's email address.
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Generic claim extractor — parses all claims then applies the provided resolver function.
    // Used internally to avoid duplicating token-parsing code for each claim type.
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // A token is valid as long as it has not passed its expiration ('exp') claim.
    // NOTE: This service does not verify the user still exists because it is stateless.
    public boolean isTokenValid(String token) {
        return !isTokenExpired(token);
    }

    // Compare the token's expiration timestamp against the current system time.
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // Extract the 'exp' (expiration) claim as a Java Date.
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Parse the full JWT using JJWT's fluent builder API.
    // Throws JwtException family exceptions on tampering, expiry, or malformed tokens.
    private Claims extractAllClaims(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignInKey()) // Set the HMAC key for signature verification.
                .build()
                .parseClaimsJws(token)        // Parses and validates both header + signature.
                .getBody();                    // Returns only the claims payload.
    }

    // Decode the Base64-encoded secret string and derive the HMAC-SHA signing key.
    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey); // Converts Base64 string → raw bytes.
        return Keys.hmacShaKeyFor(keyBytes); // Wraps the bytes in a SecretKey for JJWT.
    }
}
