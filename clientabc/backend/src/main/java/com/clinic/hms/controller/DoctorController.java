// src/main/java/com/clinic/hms/controller/DoctorController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.DoctorCreateRequest;
import com.clinic.hms.dto.request.DoctorUpdateRequest;
import com.clinic.hms.dto.response.DoctorResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.service.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    // POST /api/doctors
    @PostMapping
    public ResponseEntity<DoctorResponse> create(@RequestBody DoctorCreateRequest req) {
        return ResponseEntity.ok(doctorService.createDoctor(req));
    }

    // GET /api/doctors
    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pagesize", required = false) Integer pageSize,
            @RequestParam(value = "search", required = false) String search
    ) {
        boolean usePaging = page != null || pageSize != null || (search != null && !search.isBlank());
        if (!usePaging) {
            List<DoctorResponse> items = doctorService.listDoctors();
            return ResponseEntity.ok(items);
        }
        int resolvedPage = page == null ? 1 : page;
        int resolvedPageSize = pageSize == null ? 10 : pageSize;
        PagedResponse<DoctorResponse> response =
                doctorService.listDoctorsPaged(search, resolvedPage, resolvedPageSize);
        return ResponseEntity.ok(response);
    }

    // DELETE /api/doctors/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long doctorUserId) {
        doctorService.deleteDoctor(doctorUserId);
        return ResponseEntity.noContent().build();
    }

    // PUT /api/doctors/{id}
    @PutMapping("/{id}")
    public ResponseEntity<DoctorResponse> update(@PathVariable("id") Long doctorUserId,
                                                 @RequestBody DoctorUpdateRequest req) {
        return ResponseEntity.ok(doctorService.updateDoctor(doctorUserId, req));
    }
}
