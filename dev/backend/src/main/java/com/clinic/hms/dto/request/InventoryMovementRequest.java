// src/main/java/com/clinic/hms/dto/inventory/InventoryMovementRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class InventoryMovementRequest {

    private Long itemId;
    private String date;   // "yyyy-MM-dd"
    private String type;   // ADJUST_PLUS / ADJUST_MINUS / WASTAGE
    private Double qty;
    private String note;
}
