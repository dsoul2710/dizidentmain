package com.clinic.hms.dto.response;

import com.clinic.hms.entity.OperationScope;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DoctorLookupResponse {
    private String uniqueId;
    private String fullName;
    private String speciality;
    private OperationScope operationScope;
    private boolean alreadyLinked;
    private boolean linkable;
}
