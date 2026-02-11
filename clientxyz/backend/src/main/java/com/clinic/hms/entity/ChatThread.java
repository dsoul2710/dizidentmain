package com.clinic.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_threads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_user_id")
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_user_id")
    private User doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_user_id")
    private User admin;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
