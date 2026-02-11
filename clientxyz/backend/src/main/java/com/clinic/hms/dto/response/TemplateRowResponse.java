package com.clinic.hms.dto.response;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TemplateRowResponse {

    private Long id;
    private Long itemId;
    private String itemName;
    private Double qtyPerTreatment;
}