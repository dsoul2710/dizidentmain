package com.clinic.hms.controller;

import com.clinic.hms.dto.request.TreatmentPlanRequest;
import com.clinic.hms.dto.response.TreatmentPlanResponse;
import com.clinic.hms.service.TreatmentPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TreatmentPlanController {

    private final TreatmentPlanService treatmentPlanService;

    @GetMapping("/visits/{visitId}/treatment-plan")
    public ResponseEntity<TreatmentPlanResponse> getPlan(@PathVariable Long visitId) {
        return ResponseEntity.ok(treatmentPlanService.getByVisit(visitId));
    }

    @GetMapping("/visits/{visitId}/treatment-plan/detail")
    public ResponseEntity<TreatmentPlanRequest> getPlanDetail(@PathVariable Long visitId) {
        return ResponseEntity.ok(treatmentPlanService.getDetailPayload(visitId));
    }

    @GetMapping("/treatments/resolve-price")
    public ResponseEntity<Double> resolveProcedurePrice(
            @RequestParam String categoryKey,
            @RequestParam String procedureName
    ) {
        return ResponseEntity.ok(treatmentPlanService.resolvePrice(categoryKey, procedureName));
    }

    @PostMapping("/visits/{visitId}/treatment-plan")
    public ResponseEntity<TreatmentPlanResponse> savePlanForVisit(
            @PathVariable Long visitId,
            @RequestBody TreatmentPlanRequest request
    ) {
        request.setVisitId(visitId);
        return ResponseEntity.ok(treatmentPlanService.upsert(visitId, request));
    }

}
