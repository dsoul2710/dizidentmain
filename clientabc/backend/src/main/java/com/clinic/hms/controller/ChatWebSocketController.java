package com.clinic.hms.controller;

import com.clinic.hms.dto.request.ChatMessageSendRequest;
import com.clinic.hms.dto.request.ChatSendMessageRequest;
import com.clinic.hms.dto.request.ChatUnreadCountRequest;
import com.clinic.hms.dto.response.ChatMessageResponse;
import com.clinic.hms.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void send(ChatSendMessageRequest request) {
        ChatMessageSendRequest restRequest = new ChatMessageSendRequest();
        restRequest.setSenderUserId(request.getSenderUserId());
        restRequest.setReceiverUserId(request.getReceiverUserId());
        restRequest.setContent(request.getContent());
        restRequest.setAttachmentId(request.getAttachmentId());
        restRequest.setAttachmentIds(request.getAttachmentIds());

        ChatMessageResponse saved = chatService.sendMessage(request.getThreadId(), restRequest);
        messagingTemplate.convertAndSend("/topic/chat." + saved.getThreadId(), saved);
    }

    @MessageMapping("/chat.unread.request")
    public void requestUnreadCount(ChatUnreadCountRequest request) {
        if (request == null) {
            return;
        }
        chatService.publishUnreadCount(request.getUserId());
    }
}
