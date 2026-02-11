package com.clinic.hms.dto.request;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@Getter
@Setter
public class AutoStockAdjustmentRequest {
    private Long templateId;
    private int treatmentsCount;
    private String date;
    private String note;
}

