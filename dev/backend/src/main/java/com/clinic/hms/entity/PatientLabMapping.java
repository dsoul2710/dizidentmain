package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "patient_lab_mappings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"patient_id", "lab_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientLabMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_id", nullable = false)
    private ServiceProvider lab;

    @Column(name = "status", nullable = false, length = 30)
    private String status; // ACTIVE, INACTIVE, PENDING

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;
}
