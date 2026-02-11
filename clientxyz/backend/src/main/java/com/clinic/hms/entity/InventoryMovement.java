package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // item_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private InventoryItem item;

    @Column(name = "movement_date", nullable = false)
    private LocalDate movementDate;

    @Column(name = "movement_time", nullable = false)
    private LocalDateTime movementTime;

    @Column(name = "movement_type", nullable = false, length = 30)
    private String movementType;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false, length = 5)
    private String direction; // IN / OUT

    @Column(name = "balance_after", nullable = false)
    private BigDecimal balanceAfter;

    @Column(name = "source_type", length = 30)
    private String sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    // visit_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_id")
    private Visit visit;

    // visit_treatment_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_treatment_id")
    private VisitTreatment visitTreatment;

    @Column(length = 255)
    private String notes;

    // created_by
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
