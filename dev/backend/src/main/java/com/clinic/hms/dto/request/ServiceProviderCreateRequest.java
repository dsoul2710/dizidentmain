package com.clinic.hms.dto.request;

import com.clinic.hms.entity.OperationScope;
import com.clinic.hms.entity.ServiceProviderType;
import lombok.Data;
import java.util.Set;

@Data
public class ServiceProviderCreateRequest {
    private String providerName;
    private String mobile;
    private String password;
    private Set<ServiceProviderType> providerTypes;
    private String address;

    /** Super Admin create: INDEPENDENT or INTERNAL. Ignored for Hospital Admin (forced INTERNAL). */
    private OperationScope operationScope;

    /** Required when Super Admin creates INTERNAL. */
    private Long hospitalOrgId;
}
