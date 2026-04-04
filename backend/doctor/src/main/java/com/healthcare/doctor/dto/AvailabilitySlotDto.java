package com.healthcare.doctor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AvailabilitySlotDto {
    private String dayOfWeek;
    private LocalDate specificDate;
    private String startTime;
    private String endTime;
    private Boolean active;
}
