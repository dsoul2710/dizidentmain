package com.clinic.hms.repository;

import com.clinic.hms.entity.LogtoWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogtoWebhookEventRepository extends JpaRepository<LogtoWebhookEvent, String> {
}
