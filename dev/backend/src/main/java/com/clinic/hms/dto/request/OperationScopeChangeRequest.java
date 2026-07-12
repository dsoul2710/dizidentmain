package com.clinic.hms.dto.request;

import com.clinic.hms.entity.OperationScope;
import lombok.Data;

@Data
public class OperationScopeChangeRequest {
    private OperationScope operationScope;
    /** Required when target scope is INTERNAL (create flip with multi-mapping). */
    private Long hospitalOrgId;
}
