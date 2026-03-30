package com.healthcare.auth.controller;

import com.healthcare.auth.entity.User;
import com.healthcare.auth.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    private final AdminService adminService;

    // GET /api/admin/users
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    // POST /api/admin/users
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(adminService.createUser(
                request.get("email"),
                request.get("password"),
                request.get("role")
        ));
    }

    // PUT /api/admin/users/{id}/role (Changed Integer to Long here!)
    @PutMapping("/{id}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(adminService.updateUserRole(id, request.get("role")));
    }

    // DELETE /api/admin/users/{id} (Changed Integer to Long here!)
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok("User deleted successfully");
    }

    // PUT /api/admin/users/{id}/status (Added this endpoint for admin to manage user statuses)
    @PutMapping("/{id}/status")
    public ResponseEntity<User> updateUserStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(adminService.updateUserStatus(id, request.get("status")));
    }
}