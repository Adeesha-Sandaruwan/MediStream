package com.healthcare.doctor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Marks this as a Spring Boot application:
// enables component scanning, auto-configuration, and @Configuration support.
@SpringBootApplication
public class DoctorApplication {

	public static void main(String[] args) {
		// Bootstrap the Spring IoC container and start the embedded web server (Tomcat by default).
		SpringApplication.run(DoctorApplication.class, args);
	}

}
