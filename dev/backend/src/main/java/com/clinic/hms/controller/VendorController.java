// src/main/java/com/clinic/hms/controller/VendorController.java
package com.clinic.hms.controller;

import com.clinic.hms.dto.request.VendorCreateRequest;
import com.clinic.hms.dto.response.VendorResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.service.VendorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @PostMapping
    public ResponseEntity<VendorResponse> create(@RequestBody VendorCreateRequest req) {
        return ResponseEntity.ok(vendorService.createVendor(req));
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pagesize", required = false) Integer pageSize,
            @RequestParam(value = "search", required = false) String search
    ) {
        boolean usePaging = page != null || pageSize != null || (search != null && !search.isBlank());
        if (!usePaging) {
            List<VendorResponse> items = vendorService.listVendors();
            return ResponseEntity.ok(items);
        }
        int resolvedPage = page == null ? 1 : page;
        int resolvedPageSize = pageSize == null ? 10 : pageSize;
        PagedResponse<VendorResponse> response =
                vendorService.listVendorsPaged(search, resolvedPage, resolvedPageSize);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        vendorService.deleteVendor(id);
        return ResponseEntity.noContent().build();
    }
}
