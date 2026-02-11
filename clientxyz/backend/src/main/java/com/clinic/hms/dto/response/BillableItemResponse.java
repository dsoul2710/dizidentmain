package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class BillableItemResponse {
    private Long treatmentItemId;
    private String description;
    private BigDecimal quantity;
    private BigDecimal rate;
    private BigDecimal gstPercent;
}
