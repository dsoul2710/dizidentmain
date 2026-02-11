package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "visit_treatment_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitTreatmentItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(name = "category_key", length = 100)
    private String categoryKey;

    @Column(name = "category_title", length = 200)
    private String categoryTitle;

    @Column(name = "procedure_name", length = 200)
    private String procedureName;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "odontogram_mode", length = 20)
    private String odontogramMode;

    @Column(name = "selected_teeth_json", columnDefinition = "TEXT")
    private String selectedTeethJson;

    @Column(name = "extras_json", columnDefinition = "TEXT")
    private String extrasJson;

    @Column(name = "price")
    private Double price;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
