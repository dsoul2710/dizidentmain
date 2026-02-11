package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_items_master")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamItemMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_key", nullable = false, length = 50, unique = true)
    private String itemKey;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "default_text", columnDefinition = "TEXT")
    private String defaultText;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
