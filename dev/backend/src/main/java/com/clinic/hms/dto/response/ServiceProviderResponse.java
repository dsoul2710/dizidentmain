package com.clinic.hms.dto.response;

import com.clinic.hms.entity.OperationScope;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceProviderResponse {
    private Long id;
    private String providerName;
    private String mobile;
    private String providerType;
    private Set<String> providerTypes;
    private String address;
    private String uniqueId;
    private Boolean isActive;
    private String createdAt;
    private OperationScope operationScope;
}
