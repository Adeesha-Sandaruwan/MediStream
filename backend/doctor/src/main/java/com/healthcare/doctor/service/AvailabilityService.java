package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.AvailabilitySlotDto;
import com.healthcare.doctor.entity.AvailabilitySlot;
import com.healthcare.doctor.repository.AvailabilitySlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    private final AvailabilitySlotRepository availabilitySlotRepository;

    // Creates a new availability slot for the given doctor.
    // slotType defaults to CONSULTATION when not specified.
    // dayOfWeek is derived from specificDate when a date is given, otherwise taken from the DTO.
    public AvailabilitySlot create(String doctorEmail, AvailabilitySlotDto dto) {
        String slotType = resolveSlotType(dto); // Validated and normalised (CONSULTATION or LEAVE).
        AvailabilitySlot slot = AvailabilitySlot.builder()
                .doctorEmail(doctorEmail)
                .dayOfWeek(resolveDayOfWeek(dto))   // Derive from date if provided, else use explicit day.
                .specificDate(dto.getSpecificDate()) // null for recurring slots.
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
            .slotType(slotType)
            .active(resolveActive(dto, slotType)) // LEAVE slots are always inactive.
                .build();
        return availabilitySlotRepository.save(slot);
    }

    // Returns the authenticated doctor's own slots, normalised and sorted.
    // Sorted order: specific-date slots first, then recurring day slots, then by start time.
    public List<AvailabilitySlot> getMine(String doctorEmail) {
        return availabilitySlotRepository.findByDoctorEmail(doctorEmail).stream()
                .map(this::normalizeSlotForResponse) // Fill in legacy null slotType / active values.
                .sorted(slotSort())
                .toList();
    }

    // Public lookup for a doctor's schedule by email.
    // Used by the patient booking UI to display open consultation windows.
    public List<AvailabilitySlot> getByDoctorEmail(String doctorEmail) {
        return availabilitySlotRepository.findByDoctorEmail(doctorEmail).stream()
                .map(this::normalizeSlotForResponse)
                .sorted(slotSort())
                .toList();
    }

    // Replaces all editable fields of an existing slot.
    // Ownership is enforced before any update is applied.
    public AvailabilitySlot update(String doctorEmail, Long slotId, AvailabilitySlotDto dto) {
        AvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Availability slot not found"));

        // Prevent a doctor from editing another doctor's slot.
        if (!slot.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to update this slot");
        }

        String slotType = resolveSlotType(dto);
        slot.setDayOfWeek(resolveDayOfWeek(dto));
        slot.setSpecificDate(dto.getSpecificDate());
        slot.setStartTime(dto.getStartTime());
        slot.setEndTime(dto.getEndTime());
        slot.setSlotType(slotType);
        slot.setActive(resolveActive(dto, slotType)); // Re-derive active from updated slotType.

        return availabilitySlotRepository.save(slot);
    }

    // Deletes a slot after verifying the requesting doctor owns it.
    public void delete(String doctorEmail, Long slotId) {
        AvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Availability slot not found"));

        if (!slot.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to delete this slot");
        }

        availabilitySlotRepository.delete(slot);
    }

    // Determines the dayOfWeek for the slot.
    // If a specificDate is provided, the exact day name is derived from it (takes priority).
    // If not, dayOfWeek must be explicitly set in the DTO.
    private String resolveDayOfWeek(AvailabilitySlotDto dto) {
        if (dto.getSpecificDate() != null) {
            return dto.getSpecificDate().getDayOfWeek().name(); // e.g., "MONDAY"
        }
        if (dto.getDayOfWeek() == null || dto.getDayOfWeek().isBlank()) {
            throw new RuntimeException("Either specificDate or dayOfWeek must be provided");
        }
        return dto.getDayOfWeek().trim().toUpperCase(Locale.ENGLISH);
    }

    // Comparator that orders slots for display:
    //   1. Specific-date slots first (slot.specificDate != null comes before null).
    //   2. Within specific-date slots, earlier dates first.
    //   3. Recurring slots sorted by day name, then by start time.
    private Comparator<AvailabilitySlot> slotSort() {
        return Comparator
                .comparing((AvailabilitySlot slot) -> slot.getSpecificDate() == null) // false < true, so dated slots first
                .thenComparing(AvailabilitySlot::getSpecificDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(AvailabilitySlot::getDayOfWeek, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(AvailabilitySlot::getStartTime, Comparator.nullsLast(Comparator.naturalOrder()));
    }

    // Back-fills missing slotType and active values for rows inserted before those columns existed.
    // Ensures the API always returns complete, consistent slot objects.
    private AvailabilitySlot normalizeSlotForResponse(AvailabilitySlot slot) {
        if (slot.getSlotType() == null || slot.getSlotType().isBlank()) {
            slot.setSlotType("CONSULTATION"); // Legacy rows default to consultation type.
        }
        if (slot.getActive() == null) {
            // Legacy LEAVE slots should show as inactive; everything else defaults to active.
            slot.setActive(!"LEAVE".equalsIgnoreCase(slot.getSlotType()));
        }
        return slot;
    }

    // Parses and validates the slotType from the DTO.
    // Accepts only "CONSULTATION" (default) or "LEAVE".
    private String resolveSlotType(AvailabilitySlotDto dto) {
        if (dto.getSlotType() == null || dto.getSlotType().isBlank()) {
            return "CONSULTATION"; // Default when the caller omits slotType.
        }
        String normalized = dto.getSlotType().trim().toUpperCase(Locale.ENGLISH);
        if (!normalized.equals("CONSULTATION") && !normalized.equals("LEAVE")) {
            throw new RuntimeException("slotType must be CONSULTATION or LEAVE");
        }
        return normalized;
    }

    // Determines whether the slot should be marked active.
    // LEAVE slots are always inactive (not bookable) regardless of what the DTO says.
    // CONSULTATION slots default to active=true if the DTO does not supply a value.
    private boolean resolveActive(AvailabilitySlotDto dto, String slotType) {
        if (slotType.equals("LEAVE")) {
            return false;
        }
        return dto.getActive() == null || dto.getActive();
    }
}