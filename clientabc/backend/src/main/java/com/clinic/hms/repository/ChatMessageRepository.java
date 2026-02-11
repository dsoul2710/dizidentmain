package com.clinic.hms.repository;

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

    @Query("select m.sender.id, count(m) from ChatMessage m " +
            "where m.receiver.id = :receiverId and m.isRead = false " +
            "group by m.sender.id")
    List<Object[]> countUnreadBySender(@Param("receiverId") Long receiverId);

    long deleteByThread_Id(Long threadId);
}
