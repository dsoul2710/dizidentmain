package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SourceAttribution {
    Long sourceOrgId;
    String sourceOrgName;
    SourceType sourceType;
}
