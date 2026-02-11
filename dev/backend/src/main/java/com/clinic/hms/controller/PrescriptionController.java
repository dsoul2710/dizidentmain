// src/main/java/com/clinic/hms/controller/PrescriptionController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.PrescriptionRequest;
import com.clinic.hms.dto.request.PrescriptionTemplateRequest;
import com.clinic.hms.dto.response.PrescriptionResponse;
import com.clinic.hms.entity.PrescriptionTemplate;
import com.clinic.hms.entity.User;
import com.clinic.hms.repository.PrescriptionTemplateRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionTemplateRepository templateRepository;
    private final UserRepository userRepository;
    private final PrescriptionService prescriptionService;

    // -----------------------------
    // Rx Templates
    // -----------------------------

    @GetMapping("/rx-templates")
    public ResponseEntity<List<PrescriptionTemplate>> getTemplates(
            @RequestParam(value = "doctorUserId", required = false) Long doctorUserId) {

        List<PrescriptionTemplate> templates;
        if (doctorUserId != null) {
            templates = templateRepository.findByDoctor_IdOrDoctorIsNull(doctorUserId);
        } else {
            templates = templateRepository.findAll();
        }
        return ResponseEntity.ok(templates);
    }

    @PostMapping("/rx-templates")
    public ResponseEntity<PrescriptionTemplate> createTemplate(
            @RequestBody PrescriptionTemplateRequest request) {

        if (request.getMedicineName() == null || request.getMedicineName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        User doctor = null;
        if (request.getDoctorUserId() != null) {
            doctor = userRepository.findById(request.getDoctorUserId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Doctor user not found: " + request.getDoctorUserId()));
        }

        PrescriptionTemplate template = PrescriptionTemplate.builder()
                .name(request.getName() != null ? request.getName() : request.getMedicineName())
                .medicineName(request.getMedicineName())
                .medicineContents(request.getMedicineContents())
                .medicineType(request.getMedicineType() != null ? request.getMedicineType() : "tab")
                .volume(request.getVolume() != null ? request.getVolume() : "")
                .dose(request.getDose() != null ? request.getDose() : "")
                .days(request.getDays())
                .timings(request.getTimings())
                .duration(request.getDuration())
                .instructions(request.getInstructions())
                .doctor(doctor)
                .createdAt(LocalDateTime.now())
                .build();

        PrescriptionTemplate saved = templateRepository.save(template);
        return ResponseEntity.ok(saved);
    }

    // -----------------------------
    // Prescriptions
    // -----------------------------

    @PostMapping("/prescriptions")
    public ResponseEntity<PrescriptionResponse> createPrescription(
            @RequestBody PrescriptionRequest request) {

        PrescriptionResponse prescription = prescriptionService.createPrescription(request);
        return ResponseEntity.ok(prescription);
    }

    // GET latest prescription for a visit
    @GetMapping("/visits/{visitId}/prescriptions/latest")
    public ResponseEntity<PrescriptionResponse> getLatestPrescription(
            @PathVariable Long visitId
    ) {
        return ResponseEntity.ok(prescriptionService.getLatestByVisit(visitId));
    }
}
