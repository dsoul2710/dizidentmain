package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TreatmentTemplateResponse {
    private Long id;
    private String name;
    private List<TemplateRowResponse> rows;
}
