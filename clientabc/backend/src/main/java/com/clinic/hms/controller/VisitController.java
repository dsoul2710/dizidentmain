// src/main/java/com/clinic/hms/controller/VisitController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.VisitCreateRequest;
import com.clinic.hms.dto.request.VisitUpdateRequest;
import com.clinic.hms.dto.response.VisitResponse;
import com.clinic.hms.service.VisitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VisitController {

    private final VisitService visitService;

    // GET /api/patients/{patientUserId}/visits
    @GetMapping("/patients/{patientUserId}/visits")
    public List<VisitResponse> listForPatient(@PathVariable Long patientUserId) {
        return visitService.listVisitsForPatient(patientUserId);
    }

    // POST /api/patients/{patientUserId}/visits/auto-create
    @PostMapping("/patients/{patientUserId}/visits/auto-create")
    public VisitResponse autoCreateVisit(@PathVariable Long patientUserId) {
        return visitService.autoCreateVisit(patientUserId);
    }

    // POST /api/visits
    @PostMapping("/visits")
    @ResponseStatus(HttpStatus.CREATED)
    public VisitResponse createVisit(@RequestBody VisitCreateRequest req) {
        return visitService.createVisit(req);
    }

    // PUT /api/visits/{visitId}
    @PutMapping("/visits/{visitId}")
    public VisitResponse updateVisit(
            @PathVariable Long visitId,
            @RequestBody VisitUpdateRequest req
    ) {
        return visitService.updateVisit(visitId, req);
    }
}
