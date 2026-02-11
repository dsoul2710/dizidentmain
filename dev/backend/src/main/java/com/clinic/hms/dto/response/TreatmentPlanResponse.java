package com.clinic.hms.dto.response;

import com.clinic.hms.dto.request.TreatmentPlanRequest;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class TreatmentPlanResponse {
    private Long id;
    private Long visitId;
    private Long patientUserId;
    private TreatmentPlanRequest payload;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
