package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "visit_examination_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitExaminationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // visit_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    // exam_item_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_item_id")
    private ExamItemMaster examItem;

    @Column(length = 100, nullable = false)
    private String section;

    @Column(name = "item_key", length = 100, nullable = false)
    private String itemKey;

    @Column(length = 150, nullable = false)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_abnormal", nullable = false)
    private Boolean isAbnormal = true;

    @Column(name = "vitals_json", columnDefinition = "TEXT")
    private String vitalsJson;

    @Column(name = "general_notes", columnDefinition = "TEXT")
    private String generalNotes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
