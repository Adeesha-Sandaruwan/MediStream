package com.healthcare.auth.service;

import com.healthcare.auth.entity.Role;
import com.healthcare.auth.entity.User;
import com.healthcare.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // READ: Get all users
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // CREATE: Admin can manually create users
    public User createUser(String email, String rawPassword, String role) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already in use");
        }
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .role(Role.valueOf(role.toUpperCase()))
                .build();
        return userRepository.save(user);
    }

    // UPDATE: Change user role (Changed Integer to Long here!)
    public User updateUserRole(Long id, String newRole) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setRole(Role.valueOf(newRole.toUpperCase()));
        return userRepository.save(user);
    }

    // DELETE: Remove a user (Changed Integer to Long here!)
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }
        userRepository.deleteById(id);
    }

    // UPDATE: Change user verification status (Added this method for admin to manage user statuses)
    public User updateUserStatus(Long id, String newStatus) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setVerificationStatus(newStatus.toUpperCase());
        return userRepository.save(user);
    }
}