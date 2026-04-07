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

    public AvailabilitySlot create(String doctorEmail, AvailabilitySlotDto dto) {
        String slotType = resolveSlotType(dto);
        AvailabilitySlot slot = AvailabilitySlot.builder()
                .doctorEmail(doctorEmail)
                .dayOfWeek(resolveDayOfWeek(dto))
                .specificDate(dto.getSpecificDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
            .slotType(slotType)
            .active(resolveActive(dto, slotType))
                .build();
        return availabilitySlotRepository.save(slot);
    }

    public List<AvailabilitySlot> getMine(String doctorEmail) {
        return availabilitySlotRepository.findByDoctorEmail(doctorEmail).stream()
                .map(this::normalizeSlotForResponse)
                .sorted(slotSort())
                .toList();
    }

    public List<AvailabilitySlot> getByDoctorEmail(String doctorEmail) {
        return availabilitySlotRepository.findByDoctorEmail(doctorEmail).stream()
                .map(this::normalizeSlotForResponse)
                .sorted(slotSort())
                .toList();
    }

    public AvailabilitySlot update(String doctorEmail, Long slotId, AvailabilitySlotDto dto) {
        AvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Availability slot not found"));

        if (!slot.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to update this slot");
        }

        String slotType = resolveSlotType(dto);
        slot.setDayOfWeek(resolveDayOfWeek(dto));
        slot.setSpecificDate(dto.getSpecificDate());
        slot.setStartTime(dto.getStartTime());
        slot.setEndTime(dto.getEndTime());
        slot.setSlotType(slotType);
        slot.setActive(resolveActive(dto, slotType));

        return availabilitySlotRepository.save(slot);
    }

    public void delete(String doctorEmail, Long slotId) {
        AvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Availability slot not found"));

        if (!slot.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to delete this slot");
        }

        availabilitySlotRepository.delete(slot);
    }

    private String resolveDayOfWeek(AvailabilitySlotDto dto) {
        if (dto.getSpecificDate() != null) {
            return dto.getSpecificDate().getDayOfWeek().name();
        }
        if (dto.getDayOfWeek() == null || dto.getDayOfWeek().isBlank()) {
            throw new RuntimeException("Either specificDate or dayOfWeek must be provided");
        }
        return dto.getDayOfWeek().trim().toUpperCase(Locale.ENGLISH);
    }

    private Comparator<AvailabilitySlot> slotSort() {
        return Comparator
                .comparing((AvailabilitySlot slot) -> slot.getSpecificDate() == null)
                .thenComparing(AvailabilitySlot::getSpecificDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(AvailabilitySlot::getDayOfWeek, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(AvailabilitySlot::getStartTime, Comparator.nullsLast(Comparator.naturalOrder()));
    }

    private AvailabilitySlot normalizeSlotForResponse(AvailabilitySlot slot) {
        if (slot.getSlotType() == null || slot.getSlotType().isBlank()) {
            slot.setSlotType("CONSULTATION");
        }
        if (slot.getActive() == null) {
            slot.setActive(!"LEAVE".equalsIgnoreCase(slot.getSlotType()));
        }
        return slot;
    }

    private String resolveSlotType(AvailabilitySlotDto dto) {
        if (dto.getSlotType() == null || dto.getSlotType().isBlank()) {
            return "CONSULTATION";
        }
        String normalized = dto.getSlotType().trim().toUpperCase(Locale.ENGLISH);
        if (!normalized.equals("CONSULTATION") && !normalized.equals("LEAVE")) {
            throw new RuntimeException("slotType must be CONSULTATION or LEAVE");
        }
        return normalized;
    }

    private boolean resolveActive(AvailabilitySlotDto dto, String slotType) {
        if (slotType.equals("LEAVE")) {
            return false;
        }
        return dto.getActive() == null || dto.getActive();
    }
}