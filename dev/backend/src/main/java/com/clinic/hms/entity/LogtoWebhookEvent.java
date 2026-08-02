package com.clinic.hms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "logto_webhook_events")
@Getter
@Setter
@NoArgsConstructor
public class LogtoWebhookEvent {

    @Id
    @Column(length = 128)
    private String id;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    public LogtoWebhookEvent(String id, String eventType, Instant processedAt) {
        this.id = id;
        this.eventType = eventType;
        this.processedAt = processedAt;
    }
}
