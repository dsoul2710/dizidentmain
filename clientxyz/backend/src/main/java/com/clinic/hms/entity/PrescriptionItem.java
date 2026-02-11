package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "prescription_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // prescription_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @Column(name = "medicine_name", nullable = false, length = 200)
    private String medicineName;

    @Column(name = "medicine_contents", length = 100)
    private String medicineContents;

    @Column(name = "medicine_type", nullable = false, length = 100)
    private String medicineType;

    @Column(nullable = false, length = 100)
    private String volume;

    @Column(nullable = false, length = 100)
    private String dose;

    @Column(length = 100)
    private String days;

    @Column(length = 100)
    private String timings;

    @Column(length = 50)
    private String duration;

    @Column(length = 255)
    private String instructions;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
