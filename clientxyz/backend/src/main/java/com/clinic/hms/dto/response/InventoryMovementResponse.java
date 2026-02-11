package com.clinic.hms.dto.response;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InventoryMovementResponse {

    private Long id;
    private Long itemId;
    private String itemName;
    private String date;      // yyyy-MM-dd
    private String type;      // label
    private Double change;    // +ve or -ve
    private Double resultingQty;
    private String note;
}