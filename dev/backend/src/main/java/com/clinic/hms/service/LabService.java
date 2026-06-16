// src/main/java/com/clinic/hms/service/LabService.java
package com.clinic.hms.service;

import com.clinic.hms.dto.request.LabCreateRequest;
import com.clinic.hms.dto.response.LabResponse;
import com.clinic.hms.entity.Lab;
import com.clinic.hms.repository.LabRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LabService {

    private final LabRepository labRepository;
    private final com.clinic.hms.security.SecurityUtils securityUtils;
    private final com.clinic.hms.repository.UserRepository userRepository;

    @Transactional
    public LabResponse createLab(LabCreateRequest req) {
        LocalDateTime now = LocalDateTime.now();

        com.clinic.hms.entity.User org = null;
        try {
            Long orgId = securityUtils.getActiveOrgId();
            if (orgId != null) {
                org = userRepository.findById(orgId).orElse(null);
            }
        } catch (Exception e) {
            // Ignore if no security context exists (e.g. seeding)
        }

        Lab lab = Lab.builder()
                .name(req.getName())
                .address(req.getAddress())
                .mobile(req.getMobile())
                .org(org)
                .createdAt(now)
                .updatedAt(now)
                .build();

        lab = labRepository.save(lab);

        return toResponse(lab);
    }

    @Transactional(readOnly = true)
    public List<LabResponse> listLabs() {
        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        List<Lab> labs;
        if (orgId != null) {
            labs = labRepository.findByOrg_Id(orgId);
        } else {
            labs = labRepository.findAll();
        }

        return labs.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public com.clinic.hms.dto.response.PagedResponse<LabResponse> listLabsPaged(String search, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(pageSize, 1);
        PageRequest pageable = PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        Page<Lab> result;
        if (orgId != null) {
            result = labRepository.searchLabsByOrg(orgId, search, pageable);
        } else {
            result = labRepository.searchLabs(search, pageable);
        }

        List<LabResponse> items = result.getContent().stream()
                .map(this::toResponse)
                .toList();

        return com.clinic.hms.dto.response.PagedResponse.<LabResponse>builder()
                .items(items)
                .page(safePage)
                .pageSize(safeSize)
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Transactional
    public void deleteLab(Long id) {
        Lab lab = labRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lab not found: " + id));

        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        if (orgId != null && lab.getOrg() != null && !lab.getOrg().getId().equals(orgId)) {
            throw new SecurityException("Access denied");
        }

        labRepository.deleteById(id);
    }

    @Transactional
    public LabResponse updateLab(Long id, LabCreateRequest req) {
        Lab lab = labRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lab not found: " + id));

        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        if (orgId != null && lab.getOrg() != null && !lab.getOrg().getId().equals(orgId)) {
            throw new SecurityException("Access denied");
        }

        lab.setName(req.getName());
        lab.setAddress(req.getAddress());
        lab.setMobile(req.getMobile());
        lab.setUpdatedAt(LocalDateTime.now());

        lab = labRepository.save(lab);
        return toResponse(lab);
    }

    private LabResponse toResponse(Lab lab) {
        return LabResponse.builder()
                .id(lab.getId())
                .name(lab.getName())
                .address(lab.getAddress())
                .mobile(lab.getMobile())
                .createdAt(lab.getCreatedAt() != null ? lab.getCreatedAt().toString() : null)
                .build();
    }
}
