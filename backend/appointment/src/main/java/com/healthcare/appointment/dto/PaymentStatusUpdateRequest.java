package com.healthcare.appointment.dto;

import com.healthcare.appointment.entity.AppointmentPaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentStatusUpdateRequest {
    private AppointmentPaymentStatus paymentStatus;
    private String notes;
}

