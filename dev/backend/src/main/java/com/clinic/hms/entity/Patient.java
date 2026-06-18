package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Patient extends AuditableEntity {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "unique_id", nullable = true, unique = true, length = 20)
    private String uniqueId; // Format: PAT-XXXXXX

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    private LocalDate dob;
    
    @Column(name = "age_years")
    private Integer ageYears;

    @Column(length = 20)
    private String gender;

    @Column(length = 100)
    private String city;

    @Column(name = "referred_by", length = 150)
    private String referredBy;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "medical_history", columnDefinition = "TEXT")
    private String medicalHistory;

    @Column(name = "primary_complaint", columnDefinition = "TEXT")
    private String primaryComplaint;

    @Column(name = "id_insurance_file_path", length = 255)
    private String idInsuranceFilePath;

    @Column(name = "past_reports_file_path", length = 255)
    private String pastReportsFilePath;
}
