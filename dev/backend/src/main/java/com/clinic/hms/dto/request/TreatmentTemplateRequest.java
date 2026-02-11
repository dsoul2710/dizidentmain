package com.clinic.hms.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class TreatmentTemplateRequest {
    private Long id;
    private String name;
    private List<TemplateRowRequest> rows;
}

