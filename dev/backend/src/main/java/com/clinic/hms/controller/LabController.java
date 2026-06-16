// src/main/java/com/clinic/hms/controller/LabController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.LabCreateRequest;
import com.clinic.hms.dto.response.LabResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.service.LabService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/labs")
@RequiredArgsConstructor
public class LabController {

    private final LabService labService;

    @PostMapping
    public ResponseEntity<LabResponse> create(@RequestBody LabCreateRequest req) {
        return ResponseEntity.ok(labService.createLab(req));
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pagesize", required = false) Integer pageSize,
            @RequestParam(value = "search", required = false) String search
    ) {
        boolean usePaging = page != null || pageSize != null || (search != null && !search.isBlank());
        if (!usePaging) {
            List<LabResponse> items = labService.listLabs();
            return ResponseEntity.ok(items);
        }
        int resolvedPage = page == null ? 1 : page;
        int resolvedPageSize = pageSize == null ? 10 : pageSize;
        PagedResponse<LabResponse> response =
                labService.listLabsPaged(search, resolvedPage, resolvedPageSize);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LabResponse> update(@PathVariable Long id, @RequestBody LabCreateRequest req) {
        return ResponseEntity.ok(labService.updateLab(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        labService.deleteLab(id);
        return ResponseEntity.noContent().build();
    }
}
