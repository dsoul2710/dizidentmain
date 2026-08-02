package com.clinic.hms.controller;

import com.clinic.hms.dto.logto.LogtoWebhookPayload;
import com.clinic.hms.service.logto.LogtoProvisioningService;
import com.clinic.hms.service.logto.LogtoWebhookSignatureVerifier;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhooks/logto")
@RequiredArgsConstructor
public class LogtoWebhookController {

    private final LogtoWebhookSignatureVerifier signatureVerifier;
    private final LogtoProvisioningService provisioningService;

    @PostMapping
    public ResponseEntity<Void> handleWebhook(
            @RequestBody byte[] rawBody,
            @RequestHeader(value = "logto-signature-sha-256", required = false) String signature) {

        if (!signatureVerifier.verify(rawBody, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String rawJson = new String(rawBody, java.nio.charset.StandardCharsets.UTF_8);
        LogtoWebhookPayload payload = provisioningService.parsePayload(rawJson);
        provisioningService.handleWebhook(rawJson, payload);
        return ResponseEntity.ok().build();
    }
}
