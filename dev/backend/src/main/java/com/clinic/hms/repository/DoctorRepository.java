package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.Doctor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    Optional<Doctor> findByIdAndIsDeletedFalse(Long id);

    Optional<Doctor> findByUniqueIdAndIsDeletedFalse(String uniqueId);

    List<Doctor> findByIsDeletedFalse();

    @Query(value = QueryConstants.Doctor.SEARCH, countQuery = QueryConstants.Doctor.SEARCH_COUNT)
    Page<Doctor> searchDoctors(
            @Param("orgId") Long orgId,
            @Param("q") String query,
            Pageable pageable
    );
}
