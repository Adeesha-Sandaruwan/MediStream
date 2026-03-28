package com.healthcare.telemedicine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TelemedicineApplication {
    public static void main(String[] args) {
        SpringApplication.run(TelemedicineApplication.class, args);
    }
}

