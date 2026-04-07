package com.healthcare.notification.service;

import com.healthcare.notification.model.Notification;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    
    @Value("${spring.mail.username}")
    private String fromEmail;
    
    public boolean sendEmail(Notification notification) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(notification.getRecipientEmail());
            helper.setSubject(notification.getSubject());
            
            // Process HTML template
            Context context = new Context();
            context.setVariable("content", notification.getContent());
            context.setVariable("subject", notification.getSubject());
            String htmlContent = templateEngine.process("notification-template", context);
            
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            log.info("Email sent successfully to: {}", notification.getRecipientEmail());
            return true;
            
        } catch (MessagingException e) {
            log.error("Failed to send email to: {}", notification.getRecipientEmail(), e);
            return false;
        }
    }
    
    public void sendSimpleEmail(String to, String subject, String text) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, true);
            
            mailSender.send(message);
            log.info("Simple email sent to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send simple email", e);
        }
    }
}