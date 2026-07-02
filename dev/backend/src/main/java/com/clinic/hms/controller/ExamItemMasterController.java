package com.clinic.hms.controller;

import com.clinic.hms.dto.response.ExamItemResponse;
import com.clinic.hms.service.ExamItemMasterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/exam-items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ExamItemMasterController {

    private final ExamItemMasterService examItemMasterService;

    @GetMapping
    public ResponseEntity<List<ExamItemResponse>> getActiveExamItems() {
        return ResponseEntity.ok(examItemMasterService.listActiveExamItems());
    }
}
