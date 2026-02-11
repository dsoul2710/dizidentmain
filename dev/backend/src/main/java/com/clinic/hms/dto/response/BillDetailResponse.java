package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class BillDetailResponse {
    private Long id;
    private String billNo;
    private LocalDateTime billDate;
    private BigDecimal grossAmount;
    private BigDecimal taxAmount;
    private BigDecimal netAmount;
    private BigDecimal paidAmount;
    private BigDecimal pendingAmount;
    private String status;
    private List<BillItemResponse> items;
    private List<PaymentResponse> payments;
}
