package com.clinic.hms.service.logto;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class LogtoWebhookSignatureVerifierTest {

    @Test
    void hmacSha256HexMatchesKnownPayload() {
        String key = "test-signing-key";
        byte[] body = "{\"event\":\"PostRegister\"}".getBytes(StandardCharsets.UTF_8);
        String signature = LogtoWebhookSignatureVerifier.hmacSha256Hex(key, body);
        assertNotNull(signature);
        assertEquals(64, signature.length());
        assertEquals(signature, LogtoWebhookSignatureVerifier.hmacSha256Hex(key, body));
    }
}
