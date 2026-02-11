package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bill_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // bill_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    @Column(name = "item_type", nullable = false, length = 30)
    private String itemType; // SERVICE / PROCEDURE / MEDICINE / OTHER

    @Column(name = "ref_id")
    private Long refId;

    @Column(nullable = false, length = 200)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity = BigDecimal.ONE;

    @Column(name = "rate", nullable = false)
    private BigDecimal rate = BigDecimal.ZERO;

    @Column(name = "tax_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPercent = BigDecimal.ZERO;

    @Column(name = "line_total", nullable = false)
    private BigDecimal lineTotal = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
