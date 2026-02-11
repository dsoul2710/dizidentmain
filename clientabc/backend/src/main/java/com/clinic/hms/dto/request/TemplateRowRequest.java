package com.clinic.hms.dto.request;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@Getter
@Setter
public class TemplateRowRequest {
    private Long itemId;
    private Double qtyPerTreatment;
}
