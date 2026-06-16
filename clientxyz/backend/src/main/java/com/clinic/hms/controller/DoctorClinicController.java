package com.clinic.hms.controller;

import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.entity.OrgDoctorMapping;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import com.clinic.hms.repository.OrgDoctorMappingRepository;
import com.clinic.hms.repository.UserDetailsRepository;
import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorClinicController {

    private final OrgDoctorMappingRepository orgDoctorMappingRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final SecurityUtils securityUtils;

    @GetMapping("/my-clinics")
    public ResponseEntity<List<OrganizationResponse>> getMyClinics() {
        User doctor = securityUtils.getCurrentUser();
        if (doctor == null || !"DOCTOR".equalsIgnoreCase(doctor.getRole())) {
            throw new SecurityException("Only authenticated doctors can fetch associated clinics");
        }

        List<OrgDoctorMapping> mappings = orgDoctorMappingRepository.findByDoctor(doctor);
        List<OrganizationResponse> responses = mappings.stream()
                .map(mapping -> {
                    User org = mapping.getOrg();
                    String name = userDetailsRepository.findByUser(org)
                            .map(UserDetails::getFullName)
                            .orElse("Clinic Org");

                    return OrganizationResponse.builder()
                            .id(org.getId())
                            .name(name)
                            .mobile(org.getMobile())
                            .isActive(org.getIsActive())
                            .createdAt(org.getCreatedAt() != null ? org.getCreatedAt().toString() : null)
                            .build();
                })
                .toList();

        return ResponseEntity.ok(responses);
    }
}
