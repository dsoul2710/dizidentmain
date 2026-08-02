package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.ServiceProvider;
import com.clinic.hms.entity.ServiceProviderType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ServiceProviderRepository extends JpaRepository<ServiceProvider, Long> {

    Optional<ServiceProvider> findByIdAndIsDeletedFalse(Long id);

    Optional<ServiceProvider> findByUniqueIdAndIsDeletedFalse(String uniqueId);

    List<ServiceProvider> findByIsDeletedFalse();

    List<ServiceProvider> findByProviderTypeAndIsDeletedFalse(ServiceProviderType providerType);

    @Query(value = QueryConstants.ServiceProvider.SEARCH, countQuery = QueryConstants.ServiceProvider.SEARCH_COUNT)
    Page<ServiceProvider> searchServiceProviders(
            @Param("orgId") Long orgId,
            @Param("q") String query,
            Pageable pageable
    );
}
