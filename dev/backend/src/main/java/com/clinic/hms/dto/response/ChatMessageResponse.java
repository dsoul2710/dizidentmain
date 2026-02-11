package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ChatMessageResponse {

    private Long id;
    private Long threadId;
    private Long senderUserId;
    private String senderName;
    private String senderRole;
    private Long receiverUserId;
    private String content;
    private String messageType;
    private ChatAttachmentResponse attachment;
    private List<ChatAttachmentResponse> attachments;
    private String createdAt;
}
