package com.clinic.hms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceProviderResponse {
    private Long id;
    private String providerName;
    private String mobile;
    private String providerType;
    private String address;
    private String uniqueId;
    private Boolean isActive;
    private String createdAt;
}
