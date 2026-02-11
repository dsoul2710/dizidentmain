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

    @Transactional
    public VendorResponse createVendor(VendorCreateRequest req) {
        LocalDateTime now = LocalDateTime.now();

        Vendor vendor = Vendor.builder()
                .name(req.getName())
                .address(req.getAddress())
                .mobile(req.getMobile())
                .category(req.getCategory())
                .gstNo(req.getGstNo())
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        vendor = vendorRepository.save(vendor);
        return toResponse(vendor);
    }

    @Transactional(readOnly = true)
    public List<VendorResponse> listVendors() {
        return vendorRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public com.clinic.hms.dto.response.PagedResponse<VendorResponse> listVendorsPaged(String search, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(pageSize, 1);
        PageRequest pageable = PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Vendor> result = vendorRepository.searchVendors(search, pageable);
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
        if (!vendorRepository.existsById(id)) {
            throw new IllegalArgumentException("Vendor not found: " + id);
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
