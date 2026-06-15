package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "visits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_user_id", nullable = false)
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_user_id")
    private User doctor;

    @Column(name = "visit_date", nullable = false)
    private LocalDateTime visitDate;

    @Column(name = "visit_type", length = 30)
    private String visitType; // NEW / FOLLOWUP / EMERGENCY

    @Column(name = "chief_complaint", columnDefinition = "TEXT")
    private String chiefComplaint;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, length = 30)
    private String status = "OPEN";

    // NEW: Odontogram + Diagnosis
    @Column(name = "odo_mode", length = 20)
    private String odontogramMode; // "adult" / "child"

    @Column(name = "odo_teeth_json", columnDefinition = "TEXT")
    private String odontogramTeethJson; // e.g. "11,12,13"

    @Column(name = "diag_free_text", columnDefinition = "TEXT")
    private String diagnosisFreeText;

    @Column(name = "diag_final_text", columnDefinition = "TEXT")
    private String diagnosisFinalText;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "diag_report_type", length = 50)
    private String diagnosisReportType;

    @Column(name = "diag_report_note", columnDefinition = "TEXT")
    private String diagnosisReportNote;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_user_id")
    private User org;
}
