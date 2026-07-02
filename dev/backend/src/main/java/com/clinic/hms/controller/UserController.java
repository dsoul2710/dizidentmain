package com.clinic.hms.controller;

import com.clinic.hms.dto.response.ModulePermissionResponse;
import com.clinic.hms.dto.response.UserSummaryResponse;
import com.clinic.hms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserSummaryResponse> list(@RequestParam(value = "role", required = false) String role) {
        return userService.listUsers(role);
    }

    @GetMapping("/{userId}/permissions")
    public List<ModulePermissionResponse> getPermissions(@PathVariable("userId") Long userId) {
        return userService.getPermissions(userId);
    }

    @PutMapping("/{userId}/permissions")
    public List<ModulePermissionResponse> updatePermissions(
            @PathVariable("userId") Long userId,
            @RequestBody List<ModulePermissionResponse> requestList) {
        return userService.updatePermissions(userId, requestList);
    }

    @PutMapping("/{userId}/status")
    public UserSummaryResponse toggleStatus(
            @PathVariable("userId") Long userId,
            @RequestParam("active") boolean active) {
        return userService.toggleStatus(userId, active);
    }
}
