package com.clinic.hms.dto.response;

import com.clinic.hms.entity.OperationScope;
import lombok.Builder;
import lombok.Data;

import java.util.Set;

@Data
@Builder
public class ServiceProviderLookupResponse {
    private String uniqueId;
    private String providerName;
    private Set<String> providerTypes;
    private OperationScope operationScope;
    private boolean alreadyLinked;
    private boolean linkable;
}
