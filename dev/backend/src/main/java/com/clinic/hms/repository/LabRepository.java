// src/main/java/com/clinic/hms/repository/LabRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.Lab;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LabRepository extends JpaRepository<Lab, Long> {

    @Query(value = QueryConstants.Lab.SEARCH, countQuery = QueryConstants.Lab.SEARCH_COUNT)
    Page<Lab> searchLabs(@Param("q") String query, Pageable pageable);

    java.util.List<Lab> findByOrg_Id(Long orgId);

    @Query(value = QueryConstants.Lab.SEARCH_BY_ORG, countQuery = QueryConstants.Lab.SEARCH_BY_ORG_COUNT)
    Page<Lab> searchLabsByOrg(@Param("orgId") Long orgId, @Param("q") String query, Pageable pageable);
}
