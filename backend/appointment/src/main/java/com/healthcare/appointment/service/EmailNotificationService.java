package com.healthcare.appointment.service;

import com.healthcare.appointment.dto.AppointmentResponse;
import com.healthcare.appointment.entity.AppointmentStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

/**
 * Service for handling email notifications for appointment-related events
 * 
 * Sends asynchronous emails to patients and doctors for:
 * - New appointment confirmation
 * - Appointment approval/rejection
 * - Appointment cancellation
 * - Appointment reminders
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@healthcare-system.com}")
    private String fromEmail;

    @Value("${app.name:Healthcare Appointment System}")
    private String appName;

    private static final DateTimeFormatter dateTimeFormatter = 
            DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    /**
     * Send appointment creation confirmation to patient
     */
    @Async
    public void sendAppointmentCreationEmail(AppointmentResponse appointment) {
        try {
            String patientEmail = appointment.getPatientInfo().getEmail();
            String patientName = appointment.getPatientInfo().getName();
            String doctorName = appointment.getDoctorInfo().getName();
            String appointmentDateTime = appointment.getAppointmentDate()
                    .format(dateTimeFormatter);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(patientEmail);
            message.setSubject("Appointment Confirmation - " + appName);
            message.setText(buildAppointmentCreationEmailBody(
                    patientName, doctorName, appointmentDateTime, appointment.getReason()
            ));

            mailSender.send(message);
            log.info("Appointment creation email sent to: {}", patientEmail);
        } catch (Exception e) {
            log.error("Failed to send appointment creation email", e);
        }
    }

    /**
     * Send appointment creation notification to doctor
     */
    @Async
    public void sendAppointmentCreationNotificationToDoctor(AppointmentResponse appointment) {
        try {
            String doctorEmail = appointment.getDoctorInfo().getEmail();
            String doctorName = appointment.getDoctorInfo().getName();
            String patientName = appointment.getPatientInfo().getName();
            String appointmentDateTime = appointment.getAppointmentDate()
                    .format(dateTimeFormatter);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(doctorEmail);
            message.setSubject("New Appointment Request - " + appName);
            message.setText(buildDoctorNotificationEmailBody(
                    doctorName, patientName, appointmentDateTime, appointment.getReason()
            ));

            mailSender.send(message);
            log.info("Appointment notification email sent to doctor: {}", doctorEmail);
        } catch (Exception e) {
            log.error("Failed to send appointment notification email to doctor", e);
        }
    }

    /**
     * Send appointment status update to patient
     */
    @Async
    public void sendAppointmentStatusUpdateEmail(AppointmentResponse appointment) {
        try {
            String patientEmail = appointment.getPatientInfo().getEmail();
            String patientName = appointment.getPatientInfo().getName();
            String doctorName = appointment.getDoctorInfo().getName();
            String appointmentDateTime = appointment.getAppointmentDate()
                    .format(dateTimeFormatter);
            AppointmentStatus status = appointment.getStatus();

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(patientEmail);
            message.setSubject("Appointment Status Update - " + appName);
            message.setText(buildStatusUpdateEmailBody(
                    patientName, doctorName, appointmentDateTime, status
            ));

            mailSender.send(message);
            log.info("Appointment status update email sent to: {}", patientEmail);
        } catch (Exception e) {
            log.error("Failed to send appointment status update email", e);
        }
    }

    /**
     * Send appointment cancellation confirmation
     */
    @Async
    public void sendAppointmentCancellationEmail(AppointmentResponse appointment) {
        try {
            String patientEmail = appointment.getPatientInfo().getEmail();
            String patientName = appointment.getPatientInfo().getName();
            String doctorName = appointment.getDoctorInfo().getName();
            String appointmentDateTime = appointment.getAppointmentDate()
                    .format(dateTimeFormatter);
            String cancellationReason = appointment.getCancelledReason();

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(patientEmail);
            message.setSubject("Appointment Cancellation - " + appName);
            message.setText(buildCancellationEmailBody(
                    patientName, doctorName, appointmentDateTime, cancellationReason
            ));

            mailSender.send(message);
            log.info("Appointment cancellation email sent to: {}", patientEmail);
        } catch (Exception e) {
            log.error("Failed to send appointment cancellation email", e);
        }
    }

    /**
     * Send appointment cancellation notification to doctor
     */
    @Async
    public void sendAppointmentCancellationNotificationToDoctor(AppointmentResponse appointment) {
        try {
            String doctorEmail = appointment.getDoctorInfo().getEmail();
            String doctorName = appointment.getDoctorInfo().getName();
            String patientName = appointment.getPatientInfo().getName();
            String appointmentDateTime = appointment.getAppointmentDate()
                    .format(dateTimeFormatter);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(doctorEmail);
            message.setSubject("Appointment Cancellation - " + appName);
            message.setText(buildDoctorCancellationEmailBody(
                    doctorName, patientName, appointmentDateTime
            ));

            mailSender.send(message);
            log.info("Appointment cancellation notification sent to doctor: {}", doctorEmail);
        } catch (Exception e) {
            log.error("Failed to send appointment cancellation notification to doctor", e);
        }
    }

    /**
     * Build email body for appointment creation to patient
     */
    private String buildAppointmentCreationEmailBody(String patientName, String doctorName,
                                                     String appointmentDateTime, String reason) {
        return String.format(
                "Dear %s,\n\n" +
                "Your appointment request has been received.\n\n" +
                "Appointment Details:\n" +
                "- Doctor: %s\n" +
                "- Date & Time: %s\n" +
                "- Reason: %s\n\n" +
                "Status: Pending confirmation from the doctor.\n" +
                "We will notify you once the doctor approves or rejects your appointment request.\n\n" +
                "Best regards,\n%s Team",
                patientName, doctorName, appointmentDateTime, reason, appName
        );
    }

    /**
     * Build email body for appointment notification to doctor
     */
    private String buildDoctorNotificationEmailBody(String doctorName, String patientName,
                                                    String appointmentDateTime, String reason) {
        return String.format(
                "Dear Dr. %s,\n\n" +
                "You have a new appointment request.\n\n" +
                "Appointment Details:\n" +
                "- Patient: %s\n" +
                "- Requested Date & Time: %s\n" +
                "- Reason: %s\n\n" +
                "Please log in to your dashboard to approve or reject this request.\n\n" +
                "Best regards,\n%s Team",
                doctorName, patientName, appointmentDateTime, reason, appName
        );
    }

    /**
     * Build email body for status update
     */
    private String buildStatusUpdateEmailBody(String patientName, String doctorName,
                                             String appointmentDateTime, AppointmentStatus status) {
        String statusMessage = switch(status) {
            case APPROVED -> "Your appointment has been APPROVED by Dr. " + doctorName +
                    ". Please mark your calendar for " + appointmentDateTime + ".";
            case REJECTED -> "Unfortunately, your appointment request has been REJECTED by Dr. " + doctorName +
                    ". Please try booking another time slot.";
            case COMPLETED -> "Your appointment with Dr. " + doctorName +
                    " on " + appointmentDateTime + " has been completed.";
            default -> "Your appointment status is: " + status.getDisplayName();
        };

        return String.format(
                "Dear %s,\n\n" +
                "%s\n\n" +
                "Best regards,\n%s Team",
                patientName, statusMessage, appName
        );
    }

    /**
     * Build email body for cancellation
     */
    private String buildCancellationEmailBody(String patientName, String doctorName,
                                             String appointmentDateTime, String reason) {
        return String.format(
                "Dear %s,\n\n" +
                "Your appointment with Dr. %s on %s has been CANCELLED.\n\n" +
                "%s" +
                "If you have any questions, please contact us.\n\n" +
                "Best regards,\n%s Team",
                patientName, doctorName, appointmentDateTime,
                reason != null ? "Reason: " + reason + "\n\n" : "",
                appName
        );
    }

    /**
     * Build email body for doctor cancellation notification
     */
    private String buildDoctorCancellationEmailBody(String doctorName, String patientName,
                                                   String appointmentDateTime) {
        return String.format(
                "Dear Dr. %s,\n\n" +
                "The appointment with %s on %s has been cancelled.\n\n" +
                "Best regards,\n%s Team",
                doctorName, patientName, appointmentDateTime, appName
        );
    }
}