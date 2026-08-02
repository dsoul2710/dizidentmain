package com.clinic.hms.dto.logto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LogtoWebhookPayload {

    private String event;
    private String hookId;
    private String createdAt;
    private String userId;
    private LogtoWebhookUser user;
    private JsonNode data;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LogtoWebhookUser {
        private String id;
        private String username;
        private String primaryEmail;
        private String primaryPhone;
        private String name;
        private Map<String, Object> customData;
    }
}
