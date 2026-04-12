package com.healthcare.symptomchecker.controller;

import com.healthcare.symptomchecker.dto.SymptomAnalysisRequest;
import com.healthcare.symptomchecker.dto.SymptomAnalysisResponse;
import com.healthcare.symptomchecker.service.SymptomAnalysisService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/symptom-check")
public class SymptomAnalysisController {

    private final SymptomAnalysisService symptomAnalysisService;

    public SymptomAnalysisController(SymptomAnalysisService symptomAnalysisService) {
        this.symptomAnalysisService = symptomAnalysisService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<SymptomAnalysisResponse> analyzeSymptoms(@Valid @RequestBody SymptomAnalysisRequest request) {
        return ResponseEntity.ok(symptomAnalysisService.analyze(request));
    }
}
