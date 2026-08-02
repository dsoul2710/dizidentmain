package com.clinic.hms.dto.response;

import com.clinic.hms.entity.OperationScope;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ServiceProviderMyClinicsResponse {
    private OperationScope operationScope;
    private List<OrganizationResponse> clinics;
}
