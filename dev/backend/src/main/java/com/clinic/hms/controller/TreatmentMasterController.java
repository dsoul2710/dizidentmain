package com.clinic.hms.controller;

import com.clinic.hms.dto.response.TreatmentCategoryResponse;
import com.clinic.hms.service.TreatmentMasterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/masters")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TreatmentMasterController {

    private final TreatmentMasterService treatmentMasterService;

    @GetMapping("/treatments")
    public ResponseEntity<List<TreatmentCategoryResponse>> getTreatmentMasters() {
        return ResponseEntity.ok(treatmentMasterService.getAllActiveCategoriesWithProcedures());
    }
}
