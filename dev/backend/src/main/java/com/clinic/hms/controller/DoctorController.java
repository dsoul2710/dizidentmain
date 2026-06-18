package com.clinic.hms.controller;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.DoctorCreateRequest;
import com.clinic.hms.dto.request.DoctorUpdateRequest;
import com.clinic.hms.dto.response.DoctorResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.entity.Doctor;
import com.clinic.hms.entity.DoctorOrgMapping;
import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.repository.DoctorOrgMappingRepository;
import com.clinic.hms.repository.DoctorRepository;
import com.clinic.hms.security.SecurityUtils;
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
    private final DoctorOrgMappingRepository doctorOrgMappingRepository;
    private final DoctorRepository doctorRepository;
    private final SecurityUtils securityUtils;

    @GetMapping("/my-clinics")
    public ResponseEntity<List<OrganizationResponse>> getMyClinics() {
        User user = securityUtils.getCurrentUser();
        if (user == null || user.getRole() != UserRole.DOCTOR) {
            throw new SecurityException("Only authenticated doctors can fetch associated clinics");
        }

        Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        List<DoctorOrgMapping> mappings = doctorOrgMappingRepository.findByDoctor(doctor);
        List<OrganizationResponse> responses = mappings.stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .map(mapping -> {
                    OrgHospital org = mapping.getOrg();
                    User orgUser = org.getUser();

                    return OrganizationResponse.builder()
                            .id(org.getId())
                            .name(org.getOrgName())
                            .mobile(orgUser.getMobile())
                            .isActive(orgUser.getIsActive())
                            .createdAt(org.getCreatedAt() != null ? org.getCreatedAt().toString() : null)
                            .build();
                })
                .toList();

        return ResponseEntity.ok(responses);
    }

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

    // POST /api/doctors/onboard
    @PostMapping("/onboard")
    public ResponseEntity<Void> onboard(@RequestParam("uniqueId") String uniqueId) {
        doctorService.onboardDoctor(uniqueId);
        return ResponseEntity.ok().build();
    }
}
