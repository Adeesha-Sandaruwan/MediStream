package com.healthcare.doctor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

// JPA entity representing a single time slot in a doctor's availability schedule.
// Slots can be recurring (dayOfWeek only) or one-off (specificDate set).
// slotType='LEAVE' marks a blocked-out period; slotType='CONSULTATION' means open for booking.
@Entity
@Table(name = "availability_slots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Email of the doctor this slot belongs to; used as a foreign-key-like lookup.
    @Column(nullable = false)
    private String doctorEmail;

    // Uppercase day name (e.g., "MONDAY"). Derived from specificDate when a date is provided,
    // or explicitly set for recurring weekly slots.
    @Column(nullable = false)
    private String dayOfWeek;

    // Optional exact date for one-off slots (overrides the recurring pattern).
    // When set, dayOfWeek is derived automatically from this date.
    private LocalDate specificDate;

    @Column(nullable = false)
    private String startTime; // Start time in HH:mm format (24-hour).

    @Column(nullable = false)
    private String endTime;   // End time in HH:mm format (24-hour).

    // CONSULTATION (default) = available for booking; LEAVE = blocked out time.
    @Column
    private String slotType;

    // true = slot is bookable; false = slot is inactive or a leave block.
    // Automatically set to false when slotType is LEAVE.
    private Boolean active;
}
