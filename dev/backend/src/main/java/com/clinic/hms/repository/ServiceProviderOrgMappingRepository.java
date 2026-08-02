package com.clinic.hms.repository;

import com.clinic.hms.entity.ServiceProviderOrgMapping;
import com.clinic.hms.entity.ServiceProvider;
import com.clinic.hms.entity.OrgHospital;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ServiceProviderOrgMappingRepository extends JpaRepository<ServiceProviderOrgMapping, Long> {
    List<ServiceProviderOrgMapping> findByOrg(OrgHospital org);
    List<ServiceProviderOrgMapping> findByServiceProvider(ServiceProvider serviceProvider);
    Optional<ServiceProviderOrgMapping> findByOrgAndServiceProvider(OrgHospital org, ServiceProvider serviceProvider);
    boolean existsByOrgAndServiceProvider(OrgHospital org, ServiceProvider serviceProvider);
    boolean existsByOrg_IdAndServiceProvider_IdAndStatus(Long orgId, Long serviceProviderId, String status);
    void deleteByOrgAndServiceProvider(OrgHospital org, ServiceProvider serviceProvider);
}
