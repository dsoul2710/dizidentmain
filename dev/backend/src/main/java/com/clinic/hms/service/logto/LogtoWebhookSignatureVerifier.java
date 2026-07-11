package com.clinic.hms.service.logto;

import com.clinic.hms.config.LogtoProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
@RequiredArgsConstructor
public class LogtoWebhookSignatureVerifier {

    private static final String HEADER = "logto-signature-sha-256";

    private final LogtoProperties logtoProperties;

    public String headerName() {
        return HEADER;
    }

    public boolean verify(byte[] rawBody, String expectedSignature) {
        if (!logtoProperties.isWebhookVerifyEnabled()) {
            return true;
        }
        String signingKey = logtoProperties.getWebhookSigningKey();
        if (signingKey == null || signingKey.isBlank()) {
            return false;
        }
        if (expectedSignature == null || expectedSignature.isBlank()) {
            return false;
        }
        String computed = hmacSha256Hex(signingKey, rawBody);
        return MessageDigest.isEqual(
                computed.getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8));
    }

    static String hmacSha256Hex(String signingKey, byte[] payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload);
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute webhook signature", e);
        }
    }
}
