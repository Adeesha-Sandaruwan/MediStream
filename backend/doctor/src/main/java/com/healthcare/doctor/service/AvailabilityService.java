package com.healthcare.doctor.service;

import com.healthcare.doctor.dto.AvailabilitySlotDto;
import com.healthcare.doctor.entity.AvailabilitySlot;
import com.healthcare.doctor.repository.AvailabilitySlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AvailabilityService {

    private final AvailabilitySlotRepository availabilitySlotRepository;

    public AvailabilitySlot create(String doctorEmail, AvailabilitySlotDto dto) {
        AvailabilitySlot slot = AvailabilitySlot.builder()
                .doctorEmail(doctorEmail)
                .dayOfWeek(dto.getDayOfWeek())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .active(dto.getActive() == null || dto.getActive())
                .build();
        return availabilitySlotRepository.save(slot);
    }

    public List<AvailabilitySlot> getMine(String doctorEmail) {
        return availabilitySlotRepository.findByDoctorEmailOrderByDayOfWeekAscStartTimeAsc(doctorEmail);
    }

    public AvailabilitySlot update(String doctorEmail, Long slotId, AvailabilitySlotDto dto) {
        AvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Availability slot not found"));

        if (!slot.getDoctorEmail().equalsIgnoreCase(doctorEmail)) {
            throw new RuntimeException("You are not allowed to update this slot");
        }

        slot.setDayOfWeek(dto.getDayOfWeek());
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
}
