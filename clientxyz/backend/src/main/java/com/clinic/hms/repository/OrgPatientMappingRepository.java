package com.clinic.hms.repository;

import com.clinic.hms.entity.OrgPatientMapping;
import com.clinic.hms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrgPatientMappingRepository extends JpaRepository<OrgPatientMapping, Long> {
    List<OrgPatientMapping> findByOrg(User org);
    List<OrgPatientMapping> findByPatient(User patient);
    Optional<OrgPatientMapping> findByOrgAndPatient(User org, User patient);
    boolean existsByOrgAndPatient(User org, User patient);
    void deleteByOrgAndPatient(User org, User patient);
}
