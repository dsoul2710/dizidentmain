// src/main/java/com/clinic/hms/entity/PrescriptionTemplate.java
package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "prescription_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Optional: template name
    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "medicine_name", nullable = false, length = 200)
    private String medicineName;

    @Column(name = "medicine_contents", length = 255)
    private String medicineContents;

    @Column(name = "medicine_type", nullable = false, length = 100)
    private String medicineType; // tab / syrup / powder

    @Column(nullable = false, length = 100)
    private String volume;       // 10 tab / 100 ml / 50 gm

    @Column(nullable = false, length = 100)
    private String dose;         // Once a day / 1-0-1 etc.

    @Column(length = 100)
    private String days;

    @Column(length = 100)
    private String timings;      // Pre meal / After meal

    @Column(length = 50)
    private String duration;     // optional

    @Column(length = 255)
    private String instructions;

    // doctor_user_id (nullable for global templates)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_user_id")
    private User doctor;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
