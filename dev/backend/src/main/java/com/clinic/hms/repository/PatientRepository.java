package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    List<Patient> findByIsDeletedFalseOrderByCreatedAtDesc();

    Optional<Patient> findByIdAndIsDeletedFalse(Long id);

    boolean existsByUniqueId(String uniqueId);

    Optional<Patient> findByUniqueIdAndIsDeletedFalse(String uniqueId);

    @Query(QueryConstants.Patient.LIST)
    List<Patient> listPatients(
            @Param("orgId") Long orgId,
            @Param("doctorId") Long doctorId,
            @Param("providerId") Long providerId
    );

    @Query(value = QueryConstants.Patient.SEARCH, countQuery = QueryConstants.Patient.SEARCH_COUNT)
    Page<Patient> searchPatients(
            @Param("orgId") Long orgId,
            @Param("doctorId") Long doctorId,
            @Param("providerId") Long providerId,
            @Param("q") String query,
            Pageable pageable
    );
}
