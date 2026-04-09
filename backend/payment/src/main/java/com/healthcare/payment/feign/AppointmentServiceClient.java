package com.healthcare.payment.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Feign Client for Appointment Service Communication
 * Used to fetch appointment details and update appointment payment/status after payment events
 */
@FeignClient(name = "appointment-service", url = "${appointment.service.url:http://localhost:8086/api/v1}")
public interface AppointmentServiceClient {

    /**
     * Get appointment details by ID
     */
    @GetMapping("/appointments/{id}")
    AppointmentDto getAppointmentById(@PathVariable Long id);

    /**
     * Sync payment status after successful/failed/refunded payment events.
     */
    @PatchMapping("/appointments/{id}/payment-status")
    AppointmentDto updateAppointmentPaymentStatus(@PathVariable Long id, @RequestBody UpdateStatusRequest request);

    /**
     * Approve appointment after payment completion.
     */
    @PatchMapping("/appointments/{id}/approve")
    AppointmentDto approveAppointment(@PathVariable Long id);
}
