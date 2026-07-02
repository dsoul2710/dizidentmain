package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.ChatMessageSendRequest;
import com.clinic.hms.dto.request.ChatThreadResolveRequest;
import com.clinic.hms.dto.response.ChatAttachmentResponse;
import com.clinic.hms.dto.response.ChatMessageResponse;
import com.clinic.hms.dto.response.ChatThreadResponse;
import com.clinic.hms.dto.response.UnreadCountResponse;
import com.clinic.hms.dto.response.UnreadSenderCountResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {


    private final ChatThreadRepository chatThreadRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatAttachmentRepository chatAttachmentRepository;
    private final UserRepository userRepository;
    
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final SuperAdminRepository superAdminRepository;

    private final SimpMessagingTemplate messagingTemplate;

    @Value("${file.upload.base-dir}")
    private String baseUploadDir;

    @Transactional
    public ChatThreadResponse resolveThread(ChatThreadResolveRequest req) {
        String type = normalizeType(req.getType());
        if (type == null) {
            throw new IllegalArgumentException("Chat type is required");
        }

        LocalDateTime now = LocalDateTime.now();

        if (AppConstants.ChatType.ORG_DOCTOR.equals(type)) {
            Long orgId = requireId(req.getOrgUserId(), "orgUserId");
            Long doctorId = requireId(req.getDoctorUserId(), "doctorUserId");

            List<ChatThread> existing = chatThreadRepository.findByTypeAndOwner_IdAndDoctor_IdOrderByUpdatedAtDesc(
                    type,
                    orgId,
                    doctorId
            );

            if (!existing.isEmpty()) {
                return toThreadResponse(existing.get(0));
            }

            OrgHospital org = orgHospitalRepository.findById(orgId)
                    .orElseThrow(() -> new IllegalArgumentException("Org hospital profile not found: " + orgId));
            Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(doctorId)
                    .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found: " + doctorId));

            ChatThread thread = ChatThread.builder()
                    .type(type)
                    .owner(org.getUser())
                    .doctor(doctor)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            return toThreadResponse(chatThreadRepository.save(thread));
        }

        if (AppConstants.ChatType.ORG_PATIENT.equals(type)) {
            Long orgId = requireId(req.getOrgUserId(), "orgUserId");
            Long patientId = requireId(req.getPatientUserId(), "patientUserId");
            List<ChatThread> existing = chatThreadRepository.findByTypeAndOwner_IdAndPatient_IdOrderByUpdatedAtDesc(
                    type,
                    orgId,
                    patientId
            );

            if (!existing.isEmpty()) {
                return toThreadResponse(existing.get(0));
            }

            OrgHospital org = orgHospitalRepository.findById(orgId)
                    .orElseThrow(() -> new IllegalArgumentException("Org hospital profile not found: " + orgId));
            Patient patient = patientRepository.findByIdAndIsDeletedFalse(patientId)
                    .orElseThrow(() -> new IllegalArgumentException("Patient profile not found: " + patientId));
            ChatThread thread = ChatThread.builder()
                    .type(type)
                    .owner(org.getUser())
                    .patient(patient)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            return toThreadResponse(chatThreadRepository.save(thread));
        }

        if (AppConstants.ChatType.DOCTOR_PATIENT.equals(type)) {
            Long doctorId = requireId(req.getDoctorUserId(), "doctorUserId");
            Long patientId = requireId(req.getPatientUserId(), "patientUserId");
            List<ChatThread> existing = chatThreadRepository.findByTypeAndDoctor_IdAndPatient_IdOrderByUpdatedAtDesc(
                    type,
                    doctorId,
                    patientId
            );

            if (!existing.isEmpty()) {
                return toThreadResponse(existing.get(0));
            }

            Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(doctorId)
                    .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found: " + doctorId));
            Patient patient = patientRepository.findByIdAndIsDeletedFalse(patientId)
                    .orElseThrow(() -> new IllegalArgumentException("Patient profile not found: " + patientId));
            ChatThread thread = ChatThread.builder()
                    .type(type)
                    .doctor(doctor)
                    .patient(patient)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            return toThreadResponse(chatThreadRepository.save(thread));
        }

        throw new IllegalArgumentException("Unsupported chat type: " + type);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> listMessages(Long threadId) {
        List<ChatMessage> messages = chatMessageRepository.findByThread_IdOrderByCreatedAtAsc(threadId);
        return messages.stream().map(this::toMessageResponse).collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long threadId, ChatMessageSendRequest req) {
        ChatThread thread = chatThreadRepository.findById(threadId)
                .orElseThrow(() -> new IllegalArgumentException("Chat thread not found: " + threadId));

        List<Long> attachmentIds = normalizeAttachmentIds(req.getAttachmentId(), req.getAttachmentIds());
        if ((req.getContent() == null || req.getContent().isBlank()) && attachmentIds.isEmpty()) {
            throw new IllegalArgumentException("Message content or attachment is required");
        }
        if (attachmentIds.size() > 5) {
            throw new IllegalArgumentException("Maximum 5 attachments are allowed.");
        }

        User sender = userRepository.findById(requireId(req.getSenderUserId(), "senderUserId"))
                .orElseThrow(() -> new IllegalArgumentException("Sender user not found"));

        User receiver = null;
        if (req.getReceiverUserId() != null) {
            receiver = userRepository.findById(req.getReceiverUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Receiver user not found"));
        }

        List<ChatAttachment> attachments = new ArrayList<>();
        for (Long id : attachmentIds) {
            if (id == null) continue;
            ChatAttachment att = chatAttachmentRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
            attachments.add(att);
        }

        ChatAttachment attachment = attachments.isEmpty() ? null : attachments.get(0);
        String messageType = attachments.isEmpty() ? "TEXT" : "FILE";

        LocalDateTime now = LocalDateTime.now();
        thread.setUpdatedAt(now);

        ChatMessage message = ChatMessage.builder()
                .thread(thread)
                .sender(sender)
                .receiver(receiver)
                .content(req.getContent())
                .messageType(messageType)
                .attachment(attachment)
                .attachmentIds(attachmentIds.isEmpty()
                        ? null
                        : attachmentIds.stream().map(String::valueOf).collect(Collectors.joining(",")))
                .isRead(false)
                .createdAt(now)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        publishUnreadCount(saved.getReceiver() != null ? saved.getReceiver().getId() : null);
        return toMessageResponse(saved);
    }

    @Transactional
    public List<ChatAttachmentResponse> uploadAttachments(List<MultipartFile> files, Long uploaderId) throws IOException {
        List<MultipartFile> safeFiles = files == null
                ? List.of()
                : files.stream().filter(f -> f != null && !f.isEmpty()).toList();
        if (safeFiles.isEmpty()) {
            throw new IllegalArgumentException("No file uploaded");
        }
        if (safeFiles.size() > 5) {
            throw new IllegalArgumentException("Maximum 5 attachments are allowed.");
        }

        User uploader = userRepository.findById(requireId(uploaderId, "uploaderId"))
                .orElseThrow(() -> new IllegalArgumentException("Uploader user not found"));

        Path uploadDir = Paths.get(baseUploadDir, "chat-attachments", String.valueOf(uploaderId));
        Files.createDirectories(uploadDir);

        List<ChatAttachmentResponse> responses = new ArrayList<>();
        for (MultipartFile file : safeFiles) {
            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.isBlank()) {
                originalName = "attachment";
            }

            String safeName = originalName.replaceAll("[\\\\/:*?\"<>|]", "_").replaceAll("\\s+", "_");
            String filename = System.currentTimeMillis() + "_" + safeName;
            Path target = uploadDir.resolve(filename);

            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            ChatAttachment attachment = ChatAttachment.builder()
                    .uploadedBy(uploader)
                    .fileName(originalName)
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .storagePath(target.toString())
                    .createdAt(LocalDateTime.now())
                    .build();

            attachment = chatAttachmentRepository.save(attachment);
            responses.add(toAttachmentResponse(attachment));
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> downloadAttachment(Long attachmentId) throws IOException {
        ChatAttachment attachment = chatAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found: " + attachmentId));

        Path path = Paths.get(attachment.getStoragePath());
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(path.toUri());
        String contentType = Files.probeContentType(path);
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + attachment.getFileName() + "\"")
                .body(resource);
    }

    @Transactional(readOnly = true)
    public List<UnreadSenderCountResponse> getUnreadCountBySender(Long userId) {
        return chatMessageRepository.countUnreadBySender(userId).stream()
                .map(row -> UnreadSenderCountResponse.builder()
                        .senderUserId((Long) row[0])
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public void markThreadRead(Long threadId, Long userId) {
        List<ChatMessage> unread = chatMessageRepository.findByThread_IdAndReceiver_IdAndIsReadFalse(
                threadId,
                userId
        );

        if (unread.isEmpty()) {
            publishUnreadCount(userId);
            return;
        }

        unread.forEach(msg -> msg.setIsRead(true));
        chatMessageRepository.saveAll(unread);
        publishUnreadCount(userId);
    }

    private Long requireId(Long value, String name) {
        if (value == null) {
            throw new IllegalArgumentException("Missing required field: " + name);
        }
        return value;
    }

    private String normalizeType(String type) {
        if (type == null) {
            return null;
        }
        return type.trim().toUpperCase();
    }

    private ChatThreadResponse toThreadResponse(ChatThread thread) {
        return ChatThreadResponse.builder()
                .id(thread.getId())
                .type(thread.getType())
                .patientUserId(thread.getPatient() != null ? thread.getPatient().getId() : null)
                .doctorUserId(thread.getDoctor() != null ? thread.getDoctor().getId() : null)
                .orgUserId(thread.getOwner() != null ? thread.getOwner().getId() : null)
                .createdAt(thread.getCreatedAt() != null ? thread.getCreatedAt().toString() : null)
                .updatedAt(thread.getUpdatedAt() != null ? thread.getUpdatedAt().toString() : null)
                .build();
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        User sender = message.getSender();
        String senderName = resolveUserName(sender);
        List<ChatAttachmentResponse> attachments = new ArrayList<>();
        if (message.getAttachmentIds() != null && !message.getAttachmentIds().isBlank()) {
            Arrays.stream(message.getAttachmentIds().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .forEach((idStr) -> {
                        try {
                            Long id = Long.parseLong(idStr);
                            chatAttachmentRepository.findById(id)
                                     .map(this::toAttachmentResponse)
                                     .ifPresent(attachments::add);
                        } catch (NumberFormatException ignored) {
                            // ignore invalid ids
                        }
                    });
        } else if (message.getAttachment() != null) {
            attachments.add(toAttachmentResponse(message.getAttachment()));
        }

        return ChatMessageResponse.builder()
                .id(message.getId())
                .threadId(message.getThread().getId())
                .senderUserId(sender.getId())
                .senderName(senderName)
                .senderRole(sender.getRole().name())
                .receiverUserId(message.getReceiver() != null ? message.getReceiver().getId() : null)
                .content(message.getContent())
                .messageType(message.getMessageType())
                .attachment(message.getAttachment() != null ? toAttachmentResponse(message.getAttachment()) : null)
                .attachments(attachments.isEmpty() ? null : attachments)
                .createdAt(message.getCreatedAt() != null ? message.getCreatedAt().toString() : null)
                .build();
    }

    private List<Long> normalizeAttachmentIds(Long attachmentId, List<Long> attachmentIds) {
        List<Long> result = new ArrayList<>();
        if (attachmentIds != null) {
            attachmentIds.stream().filter(id -> id != null).forEach(result::add);
        }
        if (attachmentId != null && result.isEmpty()) {
            result.add(attachmentId);
        }
        return result;
    }

    private String resolveUserName(User user) {
        if (user == null) return null;
        if (user.getRole() == UserRole.PATIENT) {
            return patientRepository.findById(user.getId()).map(Patient::getFullName).orElse(user.getMobile());
        } else if (user.getRole() == UserRole.DOCTOR) {
            return doctorRepository.findById(user.getId()).map(Doctor::getFullName).orElse(user.getMobile());
        } else if (user.getRole() == UserRole.ORG_HOSPITAL) {
            return orgHospitalRepository.findById(user.getId()).map(OrgHospital::getOrgName).orElse(user.getMobile());
        } else if (user.getRole() == UserRole.SERVICE_PROVIDER) {
            return serviceProviderRepository.findById(user.getId()).map(ServiceProvider::getProviderName).orElse(user.getMobile());
        } else if (user.getRole() == UserRole.SUPER_ADMIN) {
            return superAdminRepository.findById(user.getId()).map(SuperAdmin::getFullName).orElse(user.getMobile());
        }
        return user.getMobile();
    }

    private ChatAttachmentResponse toAttachmentResponse(ChatAttachment attachment) {
        return ChatAttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .contentType(attachment.getContentType())
                .fileSize(attachment.getFileSize())
                .url("/api/chat/attachments/" + attachment.getId())
                .build();
    }

    public void publishUnreadCount(Long userId) {
        if (userId == null) {
            return;
        }

        long count = chatMessageRepository.countByReceiver_IdAndIsReadFalse(userId);
        UnreadCountResponse payload = UnreadCountResponse.builder()
                .userId(userId)
                .count(count)
                .build();
        messagingTemplate.convertAndSend("/topic/chat.unread." + userId, payload);
    }
}
