package com.clinic.hms.service.attribution;

import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.repository.OrgHospitalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Short-TTL in-memory cache for org display names (NFR design Q3=B).
 */
@Component
@RequiredArgsConstructor
public class OrgNameCache {

    private static final long TTL_MS = 60_000L;

    private final OrgHospitalRepository orgHospitalRepository;
    private final Map<Long, CacheEntry> cache = new ConcurrentHashMap<>();

    public Optional<String> getName(Long orgId) {
        if (orgId == null) {
            return Optional.empty();
        }
        CacheEntry entry = cache.get(orgId);
        long now = Instant.now().toEpochMilli();
        if (entry != null && now - entry.cachedAtMs < TTL_MS) {
            return Optional.ofNullable(entry.name);
        }
        return orgHospitalRepository.findById(orgId)
                .map(OrgHospital::getOrgName)
                .map(name -> {
                    cache.put(orgId, new CacheEntry(name, now));
                    return name;
                });
    }

    public void invalidate(Long orgId) {
        if (orgId != null) {
            cache.remove(orgId);
        }
    }

    private record CacheEntry(String name, long cachedAtMs) {}
}
