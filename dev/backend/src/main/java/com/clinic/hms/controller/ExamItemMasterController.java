package com.clinic.hms.controller;

import com.clinic.hms.dto.response.ExamItemResponse;
import com.clinic.hms.entity.ExamItemMaster;
import com.clinic.hms.repository.ExamItemMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exam-items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ExamItemMasterController {

    private final ExamItemMasterRepository examItemMasterRepository;

    @GetMapping
    public ResponseEntity<List<ExamItemResponse>> getActiveExamItems() {
        List<ExamItemMaster> items = examItemMasterRepository.findByIsActiveTrueOrderByDisplayOrderAscIdAsc();
        List<ExamItemResponse> response = items.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    private ExamItemResponse toResponse(ExamItemMaster item) {
        ExamItemResponse dto = new ExamItemResponse();
        dto.setId(item.getId());
        dto.setItemKey(item.getItemKey());
        dto.setTitle(item.getTitle());
        dto.setDefaultText(item.getDefaultText());
        dto.setDisplayOrder(item.getDisplayOrder());
        dto.setIsActive(item.getIsActive());
        return dto;
    }
}
