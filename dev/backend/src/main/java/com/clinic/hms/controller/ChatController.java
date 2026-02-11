package com.clinic.hms.controller;

import com.clinic.hms.dto.request.ChatMessageSendRequest;
import com.clinic.hms.dto.request.ChatThreadResolveRequest;
import com.clinic.hms.dto.response.ChatAttachmentResponse;
import com.clinic.hms.dto.response.ChatMessageResponse;
import com.clinic.hms.dto.response.ChatThreadResponse;
import com.clinic.hms.dto.response.UnreadSenderCountResponse;
import com.clinic.hms.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/threads/resolve")
    public ChatThreadResponse resolve(@RequestBody ChatThreadResolveRequest req) {
        return chatService.resolveThread(req);
    }

    @GetMapping("/threads/{threadId}/messages")
    public List<ChatMessageResponse> listMessages(@PathVariable Long threadId) {
        return chatService.listMessages(threadId);
    }

    @PostMapping("/threads/{threadId}/messages")
    public ChatMessageResponse sendMessage(
            @PathVariable Long threadId,
            @RequestBody ChatMessageSendRequest req
    ) {
        return chatService.sendMessage(threadId, req);
    }

    @PostMapping("/threads/{threadId}/read")
    public void markThreadRead(
            @PathVariable Long threadId,
            @RequestParam("userId") Long userId
    ) {
        chatService.markThreadRead(threadId, userId);
    }

    @GetMapping("/unread/by-sender")
    public List<UnreadSenderCountResponse> unreadBySender(@RequestParam("userId") Long userId) {
        return chatService.getUnreadCountBySender(userId);
    }

    @PostMapping(value = "/attachments/bulk", consumes = "multipart/form-data")
    public List<ChatAttachmentResponse> uploadAttachments(
            @RequestPart("files") List<MultipartFile> files,
            @RequestParam("uploaderId") Long uploaderId
    ) throws IOException {
        return chatService.uploadAttachments(files, uploaderId);
    }

    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentId) throws IOException {
        return chatService.downloadAttachment(attachmentId);
    }
}
