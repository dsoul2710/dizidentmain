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
    private final com.clinic.hms.repository.OrgHospitalRepository orgHospitalRepository;

    private Long resolveOwnerId() {
        try {
            String role = securityUtils.getCurrentUserRole();
            if (com.clinic.hms.constants.AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(role)) {
                return securityUtils.getCurrentUserId();
            }
            Long orgId = securityUtils.getActiveOrgId();
            if (orgId != null) {
                return orgId;
            }
        } catch (Exception e) {
            // Ignore context exceptions
        }
        return securityUtils.getCurrentUserId();
    }

    @Transactional
    public LabResponse createLab(LabCreateRequest req) {
        LocalDateTime now = LocalDateTime.now();
        Long ownerId = resolveOwnerId();
        com.clinic.hms.entity.User owner = ownerId != null ? userRepository.findById(ownerId).orElse(null) : null;

        Lab lab = Lab.builder()
                .name(req.getName())
                .address(req.getAddress())
                .mobile(req.getMobile())
                .owner(owner)
                .createdAt(now)
                .updatedAt(now)
                .build();

        lab = labRepository.save(lab);

        return toResponse(lab);
    }

    @Transactional(readOnly = true)
    public List<LabResponse> listLabs() {
        Long ownerId = resolveOwnerId();

        List<Lab> labs;
        if (ownerId != null) {
            labs = labRepository.findByOwner_Id(ownerId);
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

        Long ownerId = resolveOwnerId();

        Page<Lab> result;
        if (ownerId != null) {
            result = labRepository.searchLabsByOrg(ownerId, search, pageable);
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

        Long ownerId = resolveOwnerId();

        if (ownerId != null && lab.getOwner() != null && !lab.getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Access denied");
        }

        labRepository.deleteById(id);
    }

    @Transactional
    public LabResponse updateLab(Long id, LabCreateRequest req) {
        Lab lab = labRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lab not found: " + id));

        Long ownerId = resolveOwnerId();

        if (ownerId != null && lab.getOwner() != null && !lab.getOwner().getId().equals(ownerId)) {
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
