package com.clinic.hms.controller;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.ServiceProviderCreateRequest;
import com.clinic.hms.dto.request.ServiceProviderUpdateRequest;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.dto.response.ServiceProviderResponse;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.security.SecurityUtils;
import com.clinic.hms.service.ServiceProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/service-providers")
@RequiredArgsConstructor
public class ServiceProviderController extends BaseController {

    private final ServiceProviderService serviceProviderService;
    private final SecurityUtils securityUtils;

    private void checkSuperAdmin() {
        String role = securityUtils.getCurrentUserRole();
        if (!AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role)) {
            throw new SecurityException("Only Super Admins can manage service providers");
        }
    }

    @GetMapping("/my-clinics")
    public ResponseEntity<List<OrganizationResponse>> getMyClinics() {
        User user = securityUtils.getCurrentUser();
        if (user == null || user.getRole() != UserRole.SERVICE_PROVIDER) {
            throw new SecurityException("Only authenticated service providers can fetch associated clinics");
        }
        return ResponseEntity.ok(serviceProviderService.getMyClinics(user.getId()));
    }

    @GetMapping
    public ResponseEntity<List<ServiceProviderResponse>> list() {
        checkSuperAdmin();
        return ResponseEntity.ok(serviceProviderService.listServiceProviders());
    }

    @PostMapping
    public ResponseEntity<ServiceProviderResponse> create(@RequestBody ServiceProviderCreateRequest req) {
        checkSuperAdmin();
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceProviderService.createServiceProvider(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceProviderResponse> update(@PathVariable Long id, @RequestBody ServiceProviderUpdateRequest req) {
        checkSuperAdmin();
        return ResponseEntity.ok(serviceProviderService.updateServiceProvider(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        checkSuperAdmin();
        serviceProviderService.deleteServiceProvider(id);
        return ResponseEntity.noContent().build();
    }
}
