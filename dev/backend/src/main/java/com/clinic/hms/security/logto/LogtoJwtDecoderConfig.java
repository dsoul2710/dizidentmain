package com.clinic.hms.security.logto;

import com.clinic.hms.config.LogtoProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Slf4j
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.logto.enabled", havingValue = "true", matchIfMissing = true)
public class LogtoJwtDecoderConfig {

    private static final int MAX_ATTEMPTS = 5;
    private static final long RETRY_DELAY_MS = 2000L;

    private final LogtoProperties logtoProperties;

    @Bean
    JwtDecoder jwtDecoder() {
        Exception lastFailure = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                RestTemplate restTemplate = oidcRestTemplate();
                NimbusJwtDecoder decoder = NimbusJwtDecoder
                        .withIssuerLocation(logtoProperties.getIssuerUri())
                        .restOperations(restTemplate)
                        .build();

                OAuth2TokenValidator<Jwt> issuerValidator =
                        JwtValidators.createDefaultWithIssuer(logtoProperties.getIssuerUri());
                OAuth2TokenValidator<Jwt> audienceValidator =
                        new LogtoAudienceValidator(logtoProperties.acceptedAudiences());

                decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuerValidator, audienceValidator));
                return decoder;
            } catch (Exception ex) {
                lastFailure = ex;
                log.warn("Logto JWT decoder init attempt {}/{} failed: {}",
                        attempt, MAX_ATTEMPTS, ex.getMessage());
                if (attempt < MAX_ATTEMPTS) {
                    try {
                        Thread.sleep(RETRY_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException("Interrupted while initializing Logto JWT decoder", ie);
                    }
                }
            }
        }
        throw new IllegalStateException(
                "Unable to initialize Logto JWT decoder after " + MAX_ATTEMPTS + " attempts",
                lastFailure);
    }

    private static RestTemplate oidcRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(30));
        requestFactory.setReadTimeout(Duration.ofSeconds(60));
        return new RestTemplate(requestFactory);
    }
}
