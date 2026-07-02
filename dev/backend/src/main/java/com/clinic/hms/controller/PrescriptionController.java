// src/main/java/com/clinic/hms/controller/PrescriptionController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.PrescriptionRequest;
import com.clinic.hms.dto.request.PrescriptionTemplateRequest;
import com.clinic.hms.dto.response.PrescriptionResponse;
import com.clinic.hms.entity.PrescriptionTemplate;
import com.clinic.hms.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @GetMapping("/rx-templates")
    public ResponseEntity<List<PrescriptionTemplate>> getTemplates(
            @RequestParam(value = "doctorUserId", required = false) Long doctorUserId) {
        return ResponseEntity.ok(prescriptionService.listTemplates(doctorUserId));
    }

    @PostMapping("/rx-templates")
    public ResponseEntity<PrescriptionTemplate> createTemplate(
            @RequestBody PrescriptionTemplateRequest request) {
        try {
            return ResponseEntity.ok(prescriptionService.createTemplate(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/prescriptions")
    public ResponseEntity<PrescriptionResponse> createPrescription(
            @RequestBody PrescriptionRequest request) {
        return ResponseEntity.ok(prescriptionService.createPrescription(request));
    }

    @GetMapping("/visits/{visitId}/prescriptions/latest")
    public ResponseEntity<PrescriptionResponse> getLatestPrescription(
            @PathVariable Long visitId
    ) {
        return ResponseEntity.ok(prescriptionService.getLatestByVisit(visitId));
    }
}
