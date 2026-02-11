package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponse {
    private Long id;
    private BigDecimal amount;
    private String method;
    private String referenceNo;
    private String notes;
    private LocalDateTime paymentDate;
}
