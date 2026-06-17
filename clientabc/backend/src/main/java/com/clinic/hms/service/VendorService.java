// src/main/java/com/clinic/hms/service/VendorService.java
package com.clinic.hms.service;

import com.clinic.hms.dto.request.VendorCreateRequest;
import com.clinic.hms.dto.response.VendorResponse;
import com.clinic.hms.entity.Vendor;
import com.clinic.hms.repository.VendorRepository;
import com.clinic.hms.repository.InventoryItemRepository;
import com.clinic.hms.repository.InventoryMovementRepository;
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
public class VendorService {

    private final VendorRepository vendorRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryMovementRepository inventoryMovementRepository;
    private final com.clinic.hms.security.SecurityUtils securityUtils;
    private final com.clinic.hms.repository.UserRepository userRepository;

    @Transactional
    public VendorResponse createVendor(VendorCreateRequest req) {
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

        Vendor vendor = Vendor.builder()
                .name(req.getName())
                .address(req.getAddress())
                .mobile(req.getMobile())
                .category(req.getCategory())
                .gstNo(req.getGstNo())
                .org(org)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        vendor = vendorRepository.save(vendor);
        return toResponse(vendor);
    }

    @Transactional(readOnly = true)
    public List<VendorResponse> listVendors() {
        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        List<Vendor> vendors;
        if (orgId != null) {
            vendors = vendorRepository.findByOrg_Id(orgId);
        } else {
            vendors = vendorRepository.findAll();
        }

        return vendors.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public com.clinic.hms.dto.response.PagedResponse<VendorResponse> listVendorsPaged(String search, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(pageSize, 1);
        PageRequest pageable = PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        Page<Vendor> result;
        if (orgId != null) {
            result = vendorRepository.searchVendorsByOrg(orgId, search, pageable);
        } else {
            result = vendorRepository.searchVendors(search, pageable);
        }

        List<VendorResponse> items = result.getContent().stream()
                .map(this::toResponse)
                .toList();

        return com.clinic.hms.dto.response.PagedResponse.<VendorResponse>builder()
                .items(items)
                .page(safePage)
                .pageSize(safeSize)
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Transactional
    public void deleteVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vendor not found: " + id));

        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore
        }

        if (orgId != null && vendor.getOrg() != null && !vendor.getOrg().getId().equals(orgId)) {
            throw new SecurityException("Access denied");
        }

        inventoryMovementRepository.deleteByItem_Vendor_Id(id);
        inventoryItemRepository.deleteByVendor_Id(id);
        vendorRepository.deleteById(id);
    }

    private VendorResponse toResponse(Vendor v) {
        return VendorResponse.builder()
                .id(v.getId())
                .name(v.getName())
                .address(v.getAddress())
                .mobile(v.getMobile())
                .category(v.getCategory())
                .gstNo(v.getGstNo())
                .createdAt(
                        v.getCreatedAt() != null ? v.getCreatedAt().toString() : null
                )
                .build();
    }
}
