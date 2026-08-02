package com.clinic.hms.controller;

import com.clinic.hms.dto.request.OrganizationCreateRequest;
import com.clinic.hms.dto.request.OrganizationUpdateRequest;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.service.OrganizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    public ResponseEntity<List<OrganizationResponse>> list() {
        return ResponseEntity.ok(organizationService.listOrganizations());
    }

    @PostMapping
    public ResponseEntity<OrganizationResponse> create(@RequestBody OrganizationCreateRequest req) {
        OrganizationResponse response = organizationService.createOrganization(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrganizationResponse> update(@PathVariable Long id, @RequestBody OrganizationUpdateRequest req) {
        return ResponseEntity.ok(organizationService.updateOrganization(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        organizationService.deleteOrganization(id);
        return ResponseEntity.noContent().build();
    }
}
