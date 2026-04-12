package com.healthcare.symptomchecker.service;

import com.healthcare.symptomchecker.dto.SymptomAnalysisRequest;
import com.healthcare.symptomchecker.dto.SymptomAnalysisResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class SymptomAnalysisService {

    public SymptomAnalysisResponse analyze(SymptomAnalysisRequest request) {
        String text = normalize(request.symptoms(), request.medicalHistory());

        String urgencyLevel = inferUrgency(text);
        Set<String> specialties = inferSpecialties(text);
        List<String> suggestions = inferSuggestions(text, urgencyLevel);

        return new SymptomAnalysisResponse(
                urgencyLevel,
                suggestions,
                new ArrayList<>(specialties),
                "This is a preliminary guidance tool only and not a medical diagnosis. Consult a licensed doctor for clinical decisions."
        );
    }

    private String normalize(String symptoms, String history) {
        String fullText = (symptoms == null ? "" : symptoms) + " " + (history == null ? "" : history);
        return fullText.toLowerCase(Locale.ROOT);
    }

    private String inferUrgency(String text) {
        if (containsAny(text, "chest pain", "shortness of breath", "fainting", "unconscious", "stroke", "seizure")) {
            return "HIGH";
        }

        if (containsAny(text, "high fever", "severe pain", "persistent vomiting", "blood", "worsening")) {
            return "MODERATE";
        }

        return "LOW";
    }

    private Set<String> inferSpecialties(String text) {
        Set<String> specialties = new LinkedHashSet<>();

        if (containsAny(text, "chest", "palpitation", "heart")) {
            specialties.add("Cardiology");
        }
        if (containsAny(text, "cough", "breath", "wheezing", "asthma")) {
            specialties.add("Pulmonology");
        }
        if (containsAny(text, "headache", "migraine", "dizziness", "numbness")) {
            specialties.add("Neurology");
        }
        if (containsAny(text, "stomach", "abdominal", "nausea", "diarrhea", "constipation")) {
            specialties.add("Gastroenterology");
        }
        if (containsAny(text, "rash", "itch", "skin", "acne")) {
            specialties.add("Dermatology");
        }
        if (containsAny(text, "joint", "back pain", "knee", "bone")) {
            specialties.add("Orthopedics");
        }
        if (containsAny(text, "anxiety", "panic", "depression", "sleep")) {
            specialties.add("Psychiatry");
        }
        if (containsAny(text, "period", "pregnancy", "pelvic")) {
            specialties.add("Gynecology");
        }
        if (containsAny(text, "urine", "kidney", "burning urination")) {
            specialties.add("Urology");
        }

        if (specialties.isEmpty()) {
            specialties.add("General Medicine");
        }

        return specialties;
    }

    private List<String> inferSuggestions(String text, String urgencyLevel) {
        List<String> suggestions = new ArrayList<>();

        if ("HIGH".equals(urgencyLevel)) {
            suggestions.add("Seek emergency care immediately.");
            suggestions.add("Do not delay if symptoms are sudden or getting worse.");
            suggestions.add("Avoid self-medication until assessed by a clinician.");
            return suggestions;
        }

        suggestions.add("Track symptom duration, triggers, and severity.");
        suggestions.add("Stay hydrated and rest while monitoring symptom changes.");

        if (containsAny(text, "fever")) {
            suggestions.add("Monitor temperature every 6 to 8 hours.");
        }
        if (containsAny(text, "cough", "throat")) {
            suggestions.add("Use warm fluids and avoid smoke or dust exposure.");
        }
        if (containsAny(text, "stomach", "nausea", "diarrhea")) {
            suggestions.add("Prefer light meals and oral rehydration fluids.");
        }

        suggestions.add("Book a doctor consultation if symptoms persist beyond 24 to 48 hours.");
        return suggestions;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
