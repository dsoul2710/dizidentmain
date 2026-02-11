// src/main/java/com/clinic/hms/dto/inventory/InventoryItemCreateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class InventoryItemCreateRequest {

    private String name;
    private String category;   // consumable / non-consumable / medicines / other
    private String unit;
    private String location;
    private Double minStock;
    private Double openingQty;
    private Double price;
    private String notes;
    private String vendorName; // from vendor dropdown          // nullable
    private Long vendorId;     // optional FK to vendors.id
}
