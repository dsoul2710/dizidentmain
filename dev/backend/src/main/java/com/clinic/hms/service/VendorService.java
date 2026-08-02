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
    public VendorResponse createVendor(VendorCreateRequest req) {
        LocalDateTime now = LocalDateTime.now();
        Long ownerId = resolveOwnerId();
        com.clinic.hms.entity.User owner = ownerId != null ? userRepository.findById(ownerId).orElse(null) : null;

        Vendor vendor = Vendor.builder()
                .name(req.getName())
                .address(req.getAddress())
                .mobile(req.getMobile())
                .category(req.getCategory())
                .gstNo(req.getGstNo())
                .owner(owner)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        vendor = vendorRepository.save(vendor);
        return toResponse(vendor);
    }

    @Transactional(readOnly = true)
    public List<VendorResponse> listVendors() {
        Long ownerId = resolveOwnerId();

        List<Vendor> vendors;
        if (ownerId != null) {
            vendors = vendorRepository.findByOwner_Id(ownerId);
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

        Long ownerId = resolveOwnerId();

        Page<Vendor> result;
        if (ownerId != null) {
            result = vendorRepository.searchVendorsByOrg(ownerId, search, pageable);
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

        Long ownerId = resolveOwnerId();

        if (ownerId != null && vendor.getOwner() != null && !vendor.getOwner().getId().equals(ownerId)) {
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
