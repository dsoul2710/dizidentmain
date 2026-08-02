package com.clinic.hms.service.logto;

import com.clinic.hms.dto.logto.LogtoWebhookPayload;
import com.clinic.hms.entity.LogtoWebhookEvent;
import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.repository.LogtoWebhookEventRepository;
import com.clinic.hms.repository.OrgHospitalRepository;
import com.clinic.hms.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogtoProvisioningService {

    private final LogtoWebhookEventRepository webhookEventRepository;
    private final LogtoManagementClient managementClient;
    private final PatientAccountLinkService patientAccountLinkService;
    private final OrgHospitalRepository orgHospitalRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public boolean isManagementApiConfigured() {
        return managementClient.isConfigured();
    }

    @Transactional
    public void handleWebhook(String rawJson, LogtoWebhookPayload payload) {
        String eventKey = buildEventKey(payload);
        if (webhookEventRepository.existsById(eventKey)) {
            log.debug("Skipping duplicate Logto webhook event {}", eventKey);
            return;
        }

        switch (payload.getEvent()) {
            case "PostRegister", "User.Created" -> handleUserRegistration(payload);
            case "Organization.Created" -> handleOrganizationCreated(payload);
            case "Organization.Membership.Updated" -> handleOrganizationMembershipUpdated(payload);
            default -> log.info("Unhandled Logto webhook event: {}", payload.getEvent());
        }

        webhookEventRepository.save(new LogtoWebhookEvent(
                eventKey,
                payload.getEvent(),
                Instant.now()));
    }

    @Transactional
    public Optional<String> syncHmsOrganizationToLogto(Long hmsOrgId) {
        OrgHospital org = orgHospitalRepository.findByIdAndIsDeletedFalse(hmsOrgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + hmsOrgId));

        if (org.getLogtoOrgId() != null && !org.getLogtoOrgId().isBlank()) {
            return Optional.of(org.getLogtoOrgId());
        }

        Map<String, Object> customData = new HashMap<>();
        customData.put("hmsOrgId", String.valueOf(hmsOrgId));

        Optional<String> logtoOrgId = managementClient.createOrganization(org.getOrgName(), customData);
        if (logtoOrgId.isEmpty()) {
            return Optional.empty();
        }

        org.setLogtoOrgId(logtoOrgId.get());
        org.setUpdatedAt(LocalDateTime.now());
        orgHospitalRepository.save(org);

        User orgUser = org.getUser();
        if (orgUser != null && orgUser.getLogtoUserId() != null) {
            managementClient.assignUserToOrganization(
                    logtoOrgId.get(),
                    orgUser.getLogtoUserId(),
                    new String[]{"org-admin"});
        }

        return logtoOrgId;
    }

    @Transactional
    public User linkLogtoUserManually(String logtoUserId, String mobile, UserRole role) {
        userRepository.findByLogtoUserId(logtoUserId).ifPresent(u -> {
            throw new IllegalStateException("Logto user already linked to HMS user " + u.getId());
        });

        if (role == UserRole.PATIENT) {
            return patientAccountLinkService.linkOrCreatePatientUser(logtoUserId, mobile, null);
        }

        User user = userRepository.findByMobile(mobile)
                .orElseThrow(() -> new IllegalArgumentException("HMS user not found for mobile: " + mobile));
        user.setLogtoUserId(logtoUserId);
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    private void handleUserRegistration(LogtoWebhookPayload payload) {
        LogtoWebhookPayload.LogtoWebhookUser user = payload.getUser();
        String logtoUserId = user != null && user.getId() != null ? user.getId() : payload.getUserId();
        if (logtoUserId == null) {
            log.warn("User registration webhook missing user id");
            return;
        }

        String phone = user != null ? user.getPrimaryPhone() : null;
        String name = user != null ? user.getName() : null;

        if (user != null && user.getCustomData() != null) {
            Object hmsRole = user.getCustomData().get("hmsRole");
            if ("PATIENT".equals(String.valueOf(hmsRole))) {
                patientAccountLinkService.linkOrCreatePatientUser(logtoUserId, phone, name);
                return;
            }
        }

        userRepository.findByLogtoUserId(logtoUserId).ifPresentOrElse(
                existing -> log.debug("Logto user {} already linked", logtoUserId),
                () -> {
                    if (phone != null) {
                        userRepository.findByMobile(phone).ifPresentOrElse(
                                hmsUser -> {
                                    hmsUser.setLogtoUserId(logtoUserId);
                                    hmsUser.setUpdatedAt(LocalDateTime.now());
                                    userRepository.save(hmsUser);
                                },
                                () -> patientAccountLinkService.linkOrCreatePatientUser(logtoUserId, phone, name)
                        );
                    } else {
                        log.info("Logto user {} registered without phone — manual link required", logtoUserId);
                    }
                }
        );
    }

    private void handleOrganizationCreated(LogtoWebhookPayload payload) {
        JsonNode data = payload.getData();
        if (data == null || !data.hasNonNull("id")) {
            return;
        }
        String logtoOrgId = data.get("id").asText();
        String hmsOrgId = extractHmsOrgId(data);
        if (hmsOrgId == null) {
            return;
        }
        try {
            Long orgId = Long.parseLong(hmsOrgId);
            orgHospitalRepository.findByIdAndIsDeletedFalse(orgId).ifPresent(org -> {
                org.setLogtoOrgId(logtoOrgId);
                org.setUpdatedAt(LocalDateTime.now());
                orgHospitalRepository.save(org);
            });
        } catch (NumberFormatException e) {
            log.warn("Invalid hmsOrgId in Organization.Created webhook: {}", hmsOrgId);
        }
    }

    private void handleOrganizationMembershipUpdated(LogtoWebhookPayload payload) {
        log.info("Organization membership updated: hookId={}", payload.getHookId());
    }

    private String extractHmsOrgId(JsonNode data) {
        if (data.has("customData") && data.get("customData").hasNonNull("hmsOrgId")) {
            return data.get("customData").get("hmsOrgId").asText();
        }
        return null;
    }

    private String buildEventKey(LogtoWebhookPayload payload) {
        return payload.getHookId() + ":" + payload.getCreatedAt() + ":" + payload.getEvent();
    }

    public LogtoWebhookPayload parsePayload(String rawJson) {
        try {
            return objectMapper.readValue(rawJson, LogtoWebhookPayload.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid Logto webhook JSON", e);
        }
    }
}
