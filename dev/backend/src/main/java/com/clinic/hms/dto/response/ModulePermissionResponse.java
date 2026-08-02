package com.clinic.hms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@Builder
public class ModulePermissionResponse {
    private String moduleName;
    private Boolean canView;
    private Boolean canEdit;
    private Boolean canDelete;
}
