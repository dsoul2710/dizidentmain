// src/main/java/com/clinic/hms/dto/inventory/InventoryItemResponse.java
package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InventoryItemResponse {

    private Long id;
    private String name;
    private String category;
    private String unit;
    private String location;
    private Double minStock;
    private Double currentQty;
    private Double price;
    private String notes;
    private String vendorName;
    private Long vendorId;
}
