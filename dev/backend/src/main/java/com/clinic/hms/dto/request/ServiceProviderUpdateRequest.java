package com.clinic.hms.dto.request;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ServiceProviderUpdateRequest extends ServiceProviderCreateRequest {
    private Boolean isActive;
}
