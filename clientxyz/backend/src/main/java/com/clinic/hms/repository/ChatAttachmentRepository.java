package com.clinic.hms.repository;

import com.clinic.hms.entity.ChatAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatAttachmentRepository extends JpaRepository<ChatAttachment, Long> {
}
