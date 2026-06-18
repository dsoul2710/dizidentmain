package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;

@Entity
@Table(name = "org_hospitals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrgHospital extends AuditableEntity {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "org_name", nullable = false, length = 200)
    private String orgName;

    @Column(length = 500)
    private String address;

    @Column(name = "license_number", length = 100)
    private String licenseNumber;
}
