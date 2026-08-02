package com.clinic.hms.service.logto;

import com.clinic.hms.config.LogtoProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogtoManagementClient {

    private final LogtoProperties logtoProperties;

    private volatile CachedToken cachedToken;

    public boolean isConfigured() {
        return logtoProperties.isManagementApiConfigured();
    }

    public Optional<String> createOrganization(String name, Map<String, Object> customData) {
        if (!isConfigured()) {
            log.warn("Logto Management API not configured — skipping createOrganization");
            return Optional.empty();
        }
        Map<String, Object> body = Map.of(
                "name", name,
                "description", "DiziDental HMS organization",
                "customData", customData != null ? customData : Map.of()
        );
        JsonNode response = authorizedClient()
                .post()
                .uri("/organizations")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        if (response != null && response.hasNonNull("id")) {
            return Optional.of(response.get("id").asText());
        }
        return Optional.empty();
    }

    public void assignUserToOrganization(String logtoOrgId, String logtoUserId, String[] organizationRoleNames) {
        if (!isConfigured()) {
            return;
        }
        Map<String, Object> body = Map.of(
                "organizationRoleNames", organizationRoleNames != null ? organizationRoleNames : new String[]{}
        );
        authorizedClient()
                .post()
                .uri("/organizations/{orgId}/users/{userId}", logtoOrgId, logtoUserId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    private RestClient authorizedClient() {
        return RestClient.builder()
                .baseUrl(logtoProperties.managementApiBaseUrl())
                .defaultHeader("Authorization", "Bearer " + getAccessToken())
                .build();
    }

    private synchronized String getAccessToken() {
        if (cachedToken != null && cachedToken.isValid()) {
            return cachedToken.token();
        }
        String credentials = logtoProperties.getM2mAppId() + ":" + logtoProperties.getM2mAppSecret();
        String basic = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("resource", logtoProperties.getManagementApiResource());
        form.add("scope", "all");

        JsonNode tokenResponse = RestClient.create()
                .post()
                .uri(logtoProperties.tokenEndpoint())
                .header("Authorization", "Basic " + basic)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(JsonNode.class);

        if (tokenResponse == null || !tokenResponse.hasNonNull("access_token")) {
            throw new IllegalStateException("Failed to obtain Logto Management API access token");
        }
        long expiresIn = tokenResponse.has("expires_in") ? tokenResponse.get("expires_in").asLong(3600) : 3600;
        cachedToken = new CachedToken(
                tokenResponse.get("access_token").asText(),
                Instant.now().plusSeconds(Math.max(60, expiresIn - 60))
        );
        return cachedToken.token();
    }

    private record CachedToken(String token, Instant expiresAt) {
        boolean isValid() {
            return Instant.now().isBefore(expiresAt);
        }
    }
}
