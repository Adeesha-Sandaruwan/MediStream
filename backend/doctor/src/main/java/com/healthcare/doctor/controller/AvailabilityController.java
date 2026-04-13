package com.healthcare.doctor.controller;

import com.healthcare.doctor.dto.AvailabilitySlotDto;
import com.healthcare.doctor.entity.AvailabilitySlot;
import com.healthcare.doctor.service.AvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// REST controller for managing a doctor's availability schedule.
// Doctors define recurring day-of-week slots or one-off date-specific slots.
@RestController
@RequestMapping("/api/doctors/availability")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    // POST /api/doctors/availability — Creates a new availability slot for the authenticated doctor.
    // The slot can represent a recurring weekday slot or a specific date (e.g., a leave day).
    @PostMapping
    public ResponseEntity<AvailabilitySlot> create(
            Authentication authentication,
            @RequestBody AvailabilitySlotDto dto
    ) {
        return ResponseEntity.ok(availabilityService.create(authentication.getName(), dto));
    }

    // GET /api/doctors/availability — Returns the authenticated doctor's own availability slots.
    // Results are sorted: specific-date slots first, then recurring day slots, ordered by start time.
    @GetMapping
    public ResponseEntity<List<AvailabilitySlot>> getMine(Authentication authentication) {
        return ResponseEntity.ok(availabilityService.getMine(authentication.getName()));
    }

    // GET /api/doctors/availability/doctor/{doctorEmail} — Public lookup of a doctor's schedule.
    // Used by patients and the booking UI to display available time slots.
    @GetMapping("/doctor/{doctorEmail}")
    public ResponseEntity<List<AvailabilitySlot>> getDoctorAvailability(@PathVariable String doctorEmail) {
        return ResponseEntity.ok(availabilityService.getByDoctorEmail(doctorEmail));
    }

    // PUT /api/doctors/availability/{slotId} — Updates an existing availability slot.
    // Ownership is validated server-side; a doctor cannot modify another doctor's slot.
    @PutMapping("/{slotId}")
    public ResponseEntity<AvailabilitySlot> update(
            Authentication authentication,
            @PathVariable Long slotId,
            @RequestBody AvailabilitySlotDto dto
    ) {
        return ResponseEntity.ok(availabilityService.update(authentication.getName(), slotId, dto));
    }

    // DELETE /api/doctors/availability/{slotId} — Removes an availability slot.
    // Only the owning doctor can delete their own slot.
    @DeleteMapping("/{slotId}")
    public ResponseEntity<String> delete(
            Authentication authentication,
            @PathVariable Long slotId
    ) {
        availabilityService.delete(authentication.getName(), slotId);
        return ResponseEntity.ok("Availability slot deleted successfully");
    }
}