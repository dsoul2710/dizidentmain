package com.clinic.hms.repository;

import com.clinic.hms.entity.OrgHospital;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrgHospitalRepository extends JpaRepository<OrgHospital, Long> {
    Optional<OrgHospital> findByIdAndIsDeletedFalse(Long id);
    List<OrgHospital> findByIsDeletedFalse();
}
