// src/main/java/com/clinic/hms/repository/VendorRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.Vendor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VendorRepository extends JpaRepository<Vendor, Long> {

    @Query(value = QueryConstants.Vendor.SEARCH, countQuery = QueryConstants.Vendor.SEARCH_COUNT)
    Page<Vendor> searchVendors(@Param("q") String query, Pageable pageable);

    java.util.List<Vendor> findByOwner_Id(Long ownerId);

    @Query(value = QueryConstants.Vendor.SEARCH_BY_ORG, countQuery = QueryConstants.Vendor.SEARCH_BY_ORG_COUNT)
    Page<Vendor> searchVendorsByOrg(@Param("orgId") Long ownerId, @Param("q") String query, Pageable pageable);
}
