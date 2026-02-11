package com.clinic.hms.controller;

import com.clinic.hms.dto.request.VisitExamItemRequest;
import com.clinic.hms.dto.response.VisitExamItemResponse;
import com.clinic.hms.service.VisitExamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/visits")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VisitExamController {

    private final VisitExamService visitExamService;

    // Load all saved clinical exam items for a visit
    @GetMapping("/{visitId}/exam-items")
    public ResponseEntity<List<VisitExamItemResponse>> getForVisit(
            @PathVariable Long visitId
    ) {
        return ResponseEntity.ok(visitExamService.getVisitExamItems(visitId));
    }

    @PostMapping("/{visitId}/exam-items")
    public ResponseEntity<VisitExamItemResponse> saveForVisit(
            @PathVariable Long visitId,
            @RequestBody VisitExamItemRequest request
    ) {
        request.setVisitId(visitId);
        return ResponseEntity.ok(visitExamService.saveOrUpdate(request));
    }
}
