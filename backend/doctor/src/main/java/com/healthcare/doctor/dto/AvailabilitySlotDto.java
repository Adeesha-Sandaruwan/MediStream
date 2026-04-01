package com.healthcare.doctor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AvailabilitySlotDto {
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private Boolean active;
}
