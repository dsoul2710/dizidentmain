package com.clinic.hms.controller;

import com.clinic.hms.dto.request.DoctorCreateRequest;
import com.clinic.hms.dto.request.DoctorUpdateRequest;
import com.clinic.hms.dto.response.DoctorLookupResponse;
import com.clinic.hms.dto.response.DoctorMyClinicsResponse;
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
public class DoctorController extends BaseController {

    private final DoctorService doctorService;

    @GetMapping("/my-clinics")
    public ResponseEntity<DoctorMyClinicsResponse> getMyClinics() {
        return ResponseEntity.ok(doctorService.getMyClinicsForCurrentDoctor());
    }

    @GetMapping("/lookup")
    public ResponseEntity<DoctorLookupResponse> lookup(@RequestParam("uniqueId") String uniqueId) {
        return ResponseEntity.ok(doctorService.lookupForOnboard(uniqueId));
    }

    @PostMapping
    public ResponseEntity<DoctorResponse> create(@RequestBody DoctorCreateRequest req) {
        return ResponseEntity.ok(doctorService.createDoctor(req));
    }

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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long doctorUserId) {
        doctorService.deleteDoctor(doctorUserId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<DoctorResponse> update(@PathVariable("id") Long doctorUserId,
                                                 @RequestBody DoctorUpdateRequest req) {
        return ResponseEntity.ok(doctorService.updateDoctor(doctorUserId, req));
    }

    @PostMapping("/onboard")
    public ResponseEntity<Void> onboard(@RequestParam("uniqueId") String uniqueId) {
        doctorService.onboardDoctor(uniqueId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/unlink")
    public ResponseEntity<Void> unlink(@PathVariable("id") Long doctorUserId) {
        doctorService.unlinkDoctor(doctorUserId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/operation-scope")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN')")
    public ResponseEntity<DoctorResponse> changeOperationScope(
            @PathVariable("id") Long doctorUserId,
            @RequestBody com.clinic.hms.dto.request.OperationScopeChangeRequest req) {
        return ResponseEntity.ok(doctorService.changeOperationScope(doctorUserId, req));
    }
}
