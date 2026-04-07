package com.healthcare.appointment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Main Spring Boot Application class for Appointment Service Microservice
 * 
 * This service is responsible for managing healthcare appointments,
 * including creation, updates, cancellations, and status tracking.
 * It communicates with other microservices (Patient, Doctor) via Feign clients.
 */
@SpringBootApplication
@EnableFeignClients
@EnableAsync
public class AppointmentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AppointmentServiceApplication.class, args);
    }
}