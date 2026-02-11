package com.clinic.hms.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class ChatSendMessageRequest {

    private Long threadId;
    private Long senderUserId;
    private Long receiverUserId;
    private String content;
    private Long attachmentId;
    private List<Long> attachmentIds;
}
