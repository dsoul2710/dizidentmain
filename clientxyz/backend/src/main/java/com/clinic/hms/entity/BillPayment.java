package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bill_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // bill_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    @Column(name = "payment_date", nullable = false)
    private LocalDateTime paymentDate;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 50)
    private String method; // CASH / CARD / UPI / NEFT / CHEQUE

    @Column(name = "reference_no", length = 100)
    private String referenceNo;

    @Column(length = 255)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
