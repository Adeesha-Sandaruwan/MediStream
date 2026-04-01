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

@RestController
@RequestMapping("/api/doctors/availability")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    @PostMapping
    public ResponseEntity<AvailabilitySlot> create(
            Authentication authentication,
            @RequestBody AvailabilitySlotDto dto
    ) {
        return ResponseEntity.ok(availabilityService.create(authentication.getName(), dto));
    }

    @GetMapping
    public ResponseEntity<List<AvailabilitySlot>> getMine(Authentication authentication) {
        return ResponseEntity.ok(availabilityService.getMine(authentication.getName()));
    }

    @PutMapping("/{slotId}")
    public ResponseEntity<AvailabilitySlot> update(
            Authentication authentication,
            @PathVariable Long slotId,
            @RequestBody AvailabilitySlotDto dto
    ) {
        return ResponseEntity.ok(availabilityService.update(authentication.getName(), slotId, dto));
    }

    @DeleteMapping("/{slotId}")
    public ResponseEntity<String> delete(
            Authentication authentication,
            @PathVariable Long slotId
    ) {
        availabilityService.delete(authentication.getName(), slotId);
        return ResponseEntity.ok("Availability slot deleted successfully");
    }
}
