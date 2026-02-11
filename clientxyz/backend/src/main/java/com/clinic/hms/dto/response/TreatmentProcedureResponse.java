package com.clinic.hms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TreatmentProcedureResponse {
    private Long id;
    private String name;
    private String consentText;
    private String guidelineText;
    private Integer displayOrder;
}
