package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_providers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ServiceProvider extends AuditableEntity {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "provider_name", nullable = false, length = 200)
    private String providerName;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 50)
    private ServiceProviderType providerType;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "service_provider_types", joinColumns = @JoinColumn(name = "service_provider_id"))
    @Column(name = "provider_type", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private java.util.Set<ServiceProviderType> providerTypes = new java.util.HashSet<>();

    @Column(length = 500)
    private String address;

    @Column(length = 20)
    private String mobile;

    @Column(columnDefinition = "TEXT")
    private String serviceMetadata;

    @Column(name = "unique_id", nullable = false, unique = true, length = 20)
    private String uniqueId; // Format: SP-XXXXXX
}
