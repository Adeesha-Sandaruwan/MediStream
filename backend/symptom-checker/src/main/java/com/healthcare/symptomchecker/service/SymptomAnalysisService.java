package com.healthcare.symptomchecker.service;

import com.healthcare.symptomchecker.dto.SymptomAnalysisRequest;
import com.healthcare.symptomchecker.dto.SymptomAnalysisResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class SymptomAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(SymptomAnalysisService.class);
    private static final String DEFAULT_DISCLAIMER = "This is a preliminary guidance tool only and not a medical diagnosis. Consult a licensed doctor for clinical decisions.";
    private static final Duration API_TIMEOUT = Duration.ofSeconds(30);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String geminiApiKey;
    private final String geminiModel;
    private final String geminiBaseUrl;

    public SymptomAnalysisService(
            ObjectMapper objectMapper,
            @Value("${ai.gemini.api-key:}") String geminiApiKey,
            @Value("${ai.gemini.model:gemini-flash-latest}") String geminiModel,
            @Value("${ai.gemini.base-url:https://generativelanguage.googleapis.com/v1beta/models}") String geminiBaseUrl
    ) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(API_TIMEOUT)
                .build();
        this.objectMapper = objectMapper;
        this.geminiApiKey = geminiApiKey;
        this.geminiModel = geminiModel;
        this.geminiBaseUrl = geminiBaseUrl;
    }

    public SymptomAnalysisResponse analyze(SymptomAnalysisRequest request) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            logger.warn("Gemini API key not configured. Using fallback analysis.");
            return fallbackAnalysis(request);
        }

        try {
            logger.debug("Analyzing symptoms via Gemini API: {}", request.symptoms().substring(0, Math.min(50, request.symptoms().length())));
            long startTime = System.currentTimeMillis();
            SymptomAnalysisResponse response = callGemini(request);
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Gemini analysis completed in {}ms", duration);
            return response;
        } catch (Exception e) {
            logger.warn("Gemini API failed: {}. Using fallback analysis.", e.getMessage());
            return fallbackAnalysis(request);
        }
    }

    private SymptomAnalysisResponse callGemini(SymptomAnalysisRequest request) throws IOException, InterruptedException {
        String prompt = buildPrompt(request);

        JsonNode payload = objectMapper.createObjectNode()
                .set("contents", objectMapper.createArrayNode()
                        .add(objectMapper.createObjectNode()
                                .set("parts", objectMapper.createArrayNode()
                                        .add(objectMapper.createObjectNode().put("text", prompt)))));

        ((com.fasterxml.jackson.databind.node.ObjectNode) payload)
                .set("generationConfig", objectMapper.createObjectNode()
                        .put("temperature", 0.3)
                        .put("topP", 0.95)
                        .put("responseMimeType", "application/json"));

        // Construct the Gemini API URL using X-goog-api-key header (recommended method)
        String url = String.format("%s/%s:generateContent", geminiBaseUrl, geminiModel);
        logger.info("Calling Gemini API endpoint: {}", url);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(API_TIMEOUT)
                .header("Content-Type", "application/json")
                .header("X-goog-api-key", geminiApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            logger.error("Gemini API error: HTTP {}. URL: {}. Response body: {}", 
                response.statusCode(), 
                url, 
                response.body());
            throw new IllegalStateException("Gemini API error: " + response.statusCode() + " - " + response.body());
        }

        return parseGeminiResponse(response.body());
    }

    private SymptomAnalysisResponse parseGeminiResponse(String responseBody) throws IOException {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String modelText = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();
            
            if (modelText == null || modelText.isBlank()) {
                throw new IllegalStateException("Gemini returned empty content");
            }

            JsonNode modelJson = objectMapper.readTree(stripCodeFence(modelText));

            String urgency = normalizeUrgency(modelJson.path("urgencyLevel").asText("LOW"));
            List<String> suggestions = readStringArray(modelJson.path("preliminarySuggestions"));
            List<String> specialties = readStringArray(modelJson.path("recommendedDoctorSpecialties"));
            String disclaimer = modelJson.path("disclaimer").asText(DEFAULT_DISCLAIMER);

            // Ensure at least defaults
            if (suggestions.isEmpty()) {
                suggestions = List.of("Schedule an appointment with a healthcare provider for proper evaluation.");
            }
            if (specialties.isEmpty()) {
                specialties = List.of("General Medicine");
            }

            logger.debug("Parsed response - Urgency: {}, Suggestions: {}, Specialties: {}", urgency, suggestions.size(), specialties.size());
            return new SymptomAnalysisResponse(urgency, suggestions, specialties, disclaimer);
        } catch (Exception e) {
            logger.error("Failed to parse Gemini response: {}", e.getMessage(), e);
            throw new IOException("Failed to parse Gemini response", e);
        }
    }

    private String buildPrompt(SymptomAnalysisRequest request) {
        String gender = request.gender() == null || request.gender().isBlank() ? "Not specified" : request.gender();
        String history = request.medicalHistory() == null || request.medicalHistory().isBlank() ? "None" : request.medicalHistory();
        String age = request.age() == null ? "Not specified" : request.age().toString();

        return """
                You are a medical triage AI assistant. Analyze patient symptoms comprehensively and respond ONLY with valid JSON.
                
                RESPONSE FORMAT (MUST BE VALID JSON):
                {
                  "urgencyLevel": "LOW|MODERATE|HIGH",
                  "preliminarySuggestions": ["specific suggestion based on symptoms", "contextual advice", "symptom-related guidance"],
                  "recommendedDoctorSpecialties": ["specialty1", "specialty2"],
                  "disclaimer": "This is preliminary guidance only, not a medical diagnosis. Consult a licensed physician for proper evaluation."
                }
                
                URGENCY ASSESSMENT CRITERIA:
                - HIGH: Chest/heart pain, difficulty breathing, fainting, unconsciousness, severe bleeding, stroke signs, acute severe pain
                - MODERATE: High fever (>39°C), severe persistent vomiting, bloody discharge, significant pain, worsening symptoms
                - LOW: Mild to moderate symptoms, manageable discomfort, stable condition
                
                SUGGESTION GENERATION (3 specific, actionable tips):
                - First suggestion: Immediate self-care action specific to the presented symptoms
                - Second suggestion: Symptom monitoring or management strategy based on symptom pattern and age
                - Third suggestion: Lifestyle/hygiene modification or when to seek help (timing based on urgency level)
                - MUST be specific to the symptoms, not generic advice
                - Include symptom-specific monitoring (e.g., "Monitor fever every 4 hours if high fever present")
                - Consider age and medical history for personalized recommendations
                - Focus on comfort, monitoring, and red flags to watch for
                
                SPECIALTY RECOMMENDATION CRITERIA (2-3 specialties, most relevant first):
                - Analyze symptom patterns to match exact medical specialties
                - Consider age-related conditions and medical history
                - Primary specialty first (most likely cause), secondary specialties for differential diagnosis
                - Example mappings:
                  * Chest pain + heart palpitations + breathlessness → Cardiology (primary), Pulmonology (secondary)
                  * Persistent headache + dizziness + numbness → Neurology (primary)
                  * Stomach pain + nausea + diarrhea → Gastroenterology (primary), sometimes Infectious Disease
                  * Joint pain + swelling + limited mobility → Orthopedics (primary), Rheumatology (if systemic)
                  * Persistent cough + breathlessness + wheezing → Pulmonology (primary), ENT (if throat involved)
                  * Fever + body ache + cough → General Medicine (initial), then Pulmonology if respiratory focused
                  * Skin rash + itching → Dermatology (primary), General Medicine (if systemic)
                  * Anxiety + sleep issues + fatigue → Psychiatry (primary), General Medicine (for medical causes)
                
                PATIENT PROFILE:
                Age: %s (adjust suggestions and specialties accordingly - elderly: more cardiac/neurological focus, children: infection/growth focus)
                Gender: %s (note gender-specific conditions when relevant)
                Medical History: %s (consider interactions and contraindications)
                Current Symptoms: %s
                
                CRITICAL RULES:
                - NEVER diagnose or suggest specific diseases
                - NEVER recommend medications or dosages
                - DO be specific and actionable in suggestions
                - DO tailor recommendations to the exact symptoms provided
                - DO consider the patient's age and medical history
                - DO NOT provide generic advice; each suggestion must reference the symptoms
                - Ensure descriptions fit real medical specialties
                - Return ONLY the JSON object, no markdown, code fences, or extra text
                """.formatted(age, gender, history, request.symptoms());
    }

    private String stripCodeFence(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            if (firstNewline > -1) {
                return trimmed.substring(firstNewline + 1, trimmed.length() - 3).trim();
            }
        }
        return trimmed;
    }

    private String normalizeUrgency(String urgency) {
        String normalized = urgency == null ? "LOW" : urgency.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("LOW", "MODERATE", "HIGH").contains(normalized)) {
            return "LOW";
        }
        return normalized;
    }

    private List<String> readStringArray(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node == null || !node.isArray()) {
            return values;
        }

        for (JsonNode item : node) {
            if (item.isTextual()) {
                String value = item.asText().trim();
                if (!value.isEmpty()) {
                    values.add(value);
                }
            }
        }
        return values;
    }

    private SymptomAnalysisResponse fallbackAnalysis(SymptomAnalysisRequest request) {
        String text = normalize(request.symptoms(), request.medicalHistory());

        String urgencyLevel = inferUrgency(text);
        Set<String> specialties = inferSpecialties(text);
        List<String> suggestions = inferSuggestions(text, urgencyLevel);

        return new SymptomAnalysisResponse(
                urgencyLevel,
                suggestions,
                new ArrayList<>(specialties),
                DEFAULT_DISCLAIMER
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
