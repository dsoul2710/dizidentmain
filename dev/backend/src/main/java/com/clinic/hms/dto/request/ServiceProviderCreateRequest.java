package com.clinic.hms.dto.request;

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
}
