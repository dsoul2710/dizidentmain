package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "module_permissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "module_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModulePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "module_name", nullable = false, length = 50)
    private String moduleName;

    @Column(name = "can_view", nullable = false)
    @Builder.Default
    private Boolean canView = true;

    @Column(name = "can_edit", nullable = false)
    @Builder.Default
    private Boolean canEdit = false;

    @Column(name = "can_delete", nullable = false)
    @Builder.Default
    private Boolean canDelete = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
