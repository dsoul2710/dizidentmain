package com.clinic.hms.controller;

import com.clinic.hms.dto.request.ServiceProviderCreateRequest;
import com.clinic.hms.dto.request.ServiceProviderUpdateRequest;
import com.clinic.hms.dto.response.ServiceProviderLookupResponse;
import com.clinic.hms.dto.response.ServiceProviderMyClinicsResponse;
import com.clinic.hms.dto.response.ServiceProviderResponse;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.exception.ApiException;
import com.clinic.hms.security.SecurityUtils;
import com.clinic.hms.service.ServiceProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/service-providers")
@RequiredArgsConstructor
public class ServiceProviderController extends BaseController {

    private final ServiceProviderService serviceProviderService;
    private final SecurityUtils securityUtils;

    @GetMapping("/my-clinics")
    public ResponseEntity<ServiceProviderMyClinicsResponse> getMyClinics() {
        User user = securityUtils.getCurrentUser();
        if (user == null || user.getRole() != UserRole.SERVICE_PROVIDER) {
            throw ApiException.forbidden("Only authenticated service providers can fetch associated clinics");
        }
        return ResponseEntity.ok(serviceProviderService.getMyClinics(user.getId()));
    }

    @GetMapping("/lookup")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG')")
    public ResponseEntity<ServiceProviderLookupResponse> lookup(@RequestParam("uniqueId") String uniqueId) {
        return ResponseEntity.ok(serviceProviderService.lookupForOnboard(uniqueId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG')")
    public ResponseEntity<List<ServiceProviderResponse>> list() {
        return ResponseEntity.ok(serviceProviderService.listForCurrentCaller());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG')")
    public ResponseEntity<ServiceProviderResponse> create(@RequestBody ServiceProviderCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceProviderService.createServiceProvider(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG')")
    public ResponseEntity<ServiceProviderResponse> update(@PathVariable Long id,
                                                          @RequestBody ServiceProviderUpdateRequest req) {
        return ResponseEntity.ok(serviceProviderService.updateServiceProvider(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        serviceProviderService.deleteServiceProvider(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/onboard")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG')")
    public ResponseEntity<Void> onboard(@RequestParam("uniqueId") String uniqueId) {
        serviceProviderService.onboardServiceProvider(uniqueId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/unlink")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG')")
    public ResponseEntity<Void> unlink(@PathVariable Long id) {
        serviceProviderService.unlinkServiceProvider(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/operation-scope")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN')")
    public ResponseEntity<ServiceProviderResponse> changeOperationScope(
            @PathVariable Long id,
            @RequestBody com.clinic.hms.dto.request.OperationScopeChangeRequest req) {
        return ResponseEntity.ok(serviceProviderService.changeOperationScope(id, req));
    }
}
