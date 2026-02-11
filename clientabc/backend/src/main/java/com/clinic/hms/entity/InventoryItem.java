// src/main/java/com/clinic/hms/entity/InventoryItem.java
package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_code", nullable = false, length = 50, unique = true)
    private String itemCode;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 50)
    private String unit;

    @Column(name = "opening_stock", nullable = false)
    private BigDecimal openingStock = BigDecimal.ZERO;

    @Column(name = "current_stock", nullable = false)
    private BigDecimal currentStock = BigDecimal.ZERO;

    @Column(name = "reorder_level", nullable = false)
    private BigDecimal reorderLevel = BigDecimal.ZERO;

    @Column(name = "hsn_code", length = 30)
    private String hsnCode;

    @Column(name = "gst_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal gstPercent = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // NEW: vendor name (for dropdown)
    @Column(name = "vendor_name", length = 200)
    private String vendorName;

    // FK to vendors.id (optional)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    // NEW: price per unit
    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    // Optional: location in clinic
    @Column(name = "location", length = 100)
    private String location;

    // Optional: free-text notes
    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
