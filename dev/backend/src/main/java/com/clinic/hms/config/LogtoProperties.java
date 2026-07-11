package com.clinic.hms.config;



import lombok.Getter;

import lombok.Setter;

import org.springframework.boot.context.properties.ConfigurationProperties;

import org.springframework.stereotype.Component;



import java.util.ArrayList;

import java.util.List;



@Component

@ConfigurationProperties(prefix = "app.logto")

@Getter

@Setter

public class LogtoProperties {



    private boolean enabled = true;

    private String endpoint = "https://npm5w2.logto.app";

    private String issuerUri = "https://npm5w2.logto.app/oidc";

    private String apiResource = "http://localhost:8081/api";

    private String appId = "saj00uitdlkjzdu8ebwgq";

    private String m2mAppId = "";

    private String m2mAppSecret = "";

    private String webhookSigningKey = "";

    private String managementApiResource = "https://npm5w2.logto.app/api";

    private boolean webhookVerifyEnabled = true;

    private boolean managementApiEnabled = false;



    public boolean isManagementApiConfigured() {

        return managementApiEnabled

                && m2mAppId != null && !m2mAppId.isBlank()

                && m2mAppSecret != null && !m2mAppSecret.isBlank();

    }



    public String tokenEndpoint() {

        return endpoint.replaceAll("/+$", "") + "/oidc/token";

    }



    public String managementApiBaseUrl() {

        return endpoint.replaceAll("/+$", "") + "/api";

    }



    public List<String> acceptedAudiences() {

        List<String> audiences = new ArrayList<>();

        if (apiResource != null && !apiResource.isBlank()) {

            audiences.add(apiResource);

        }

        if (appId != null && !appId.isBlank()) {

            audiences.add(appId);

        }

        return audiences;

    }

}


