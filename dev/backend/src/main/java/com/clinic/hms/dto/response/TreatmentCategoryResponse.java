package com.clinic.hms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TreatmentCategoryResponse {
    private Long id;
    private String key;
    private String title;
    private Integer displayOrder;
    private List<TreatmentProcedureResponse> procedures;
}
