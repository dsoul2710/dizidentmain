package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByThread_IdOrderByCreatedAtAsc(Long threadId);

    List<ChatMessage> findByThread_IdAndReceiver_IdAndIsReadFalse(Long threadId, Long receiverId);

    long countByReceiver_IdAndIsReadFalse(Long receiverId);

    long countByReceiver_IdAndSender_IdAndIsReadFalse(Long receiverId, Long senderId);

    @Query(QueryConstants.ChatMessage.COUNT_UNREAD_BY_SENDER)
    List<Object[]> countUnreadBySender(@Param("receiverId") Long receiverId);

    long deleteByThread_Id(Long threadId);
}
