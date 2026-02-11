// src/main/java/com/clinic/hms/entity/InventoryTreatmentTemplateRow.java
package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "inventory_treatment_template_rows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTreatmentTemplateRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // template_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private InventoryTreatmentTemplate template;

    // item_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private InventoryItem item;

    @Column(name = "qty_per_treatment", nullable = false, precision = 10, scale = 3)
    private BigDecimal qtyPerTreatment;
}
