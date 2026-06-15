package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "org_doctor_mappings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"org_user_id", "doctor_user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrgDoctorMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_user_id", nullable = false)
    private User org;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_user_id", nullable = false)
    private User doctor;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
