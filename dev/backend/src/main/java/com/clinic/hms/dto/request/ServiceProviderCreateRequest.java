package com.clinic.hms.dto.request;

import com.clinic.hms.entity.ServiceProviderType;
import lombok.Data;

@Data
public class ServiceProviderCreateRequest {
    private String providerName;
    private String mobile;
    private String password;
    private ServiceProviderType providerType;
    private String address;
}
