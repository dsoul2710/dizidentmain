package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_user_id", nullable = false)
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fulfillment_provider_user_id", nullable = false)
    private User fulfillmentProvider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_user_id", nullable = false)
    private Patient patient;

    @Column(name = "order_type", nullable = false, length = 50)
    private String orderType; // LAB, BED_MANAGER, PHARMACY, RADIOLOGY, PATHOLOGY, BLOOD_BANK, AMBULANCE, ORTHODONTIC_LAB

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson; // Stores item lists, dosage, or test requests

    @Column(name = "agreed_price", precision = 19, scale = 2)
    private BigDecimal agreedPrice;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
