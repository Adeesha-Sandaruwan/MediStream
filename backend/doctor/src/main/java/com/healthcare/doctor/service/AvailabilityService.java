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
        AvailabilitySlot slot = AvailabilitySlot.builder()
                .doctorEmail(doctorEmail)
                .dayOfWeek(resolveDayOfWeek(dto))
                .specificDate(dto.getSpecificDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .active(dto.getActive() == null || dto.getActive())
                .build();
        return availabilitySlotRepository.save(slot);
    }

    public List<AvailabilitySlot> getMine(String doctorEmail) {
        return availabilitySlotRepository.findByDoctorEmail(doctorEmail).stream()
                .sorted(slotSort())
                .toList();
    }

    public List<AvailabilitySlot> getByDoctorEmail(String doctorEmail) {
        return availabilitySlotRepository.findByDoctorEmail(doctorEmail).stream()
                .sorted(slotSort())
                .toList();
    }

    public AvailabilitySlot update(String doctorEmail, Long slotId, AvailabilitySlotDto dto) {
        AvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Availability slot not found"));

        if (!slot.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to update this slot");
        }

        slot.setDayOfWeek(resolveDayOfWeek(dto));
        slot.setSpecificDate(dto.getSpecificDate());
        slot.setStartTime(dto.getStartTime());
        slot.setEndTime(dto.getEndTime());
        slot.setActive(dto.getActive() == null || dto.getActive());

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
}