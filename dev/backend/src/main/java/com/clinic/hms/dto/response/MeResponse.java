package com.clinic.hms.dto.response;

import lombok.Builder;

import java.util.List;
import java.util.Set;

@Builder
public record MeResponse(
        String logtoSub,
        Long hmsUserId,
        String mobile,
        String role,
        String displayName,
        String providerType,
        Set<String> providerTypes,
        boolean linked,
        List<String> scopes,
        List<String> roles,
        List<String> organizationIds,
        List<String> organizationRoles,
        List<ModulePermissionResponse> modulePermissions
) {
}
