package com.clinic.hms.repository;

import com.clinic.hms.entity.OrgDoctorMapping;
import com.clinic.hms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrgDoctorMappingRepository extends JpaRepository<OrgDoctorMapping, Long> {
    List<OrgDoctorMapping> findByOrg(User org);
    List<OrgDoctorMapping> findByDoctor(User doctor);
    Optional<OrgDoctorMapping> findByOrgAndDoctor(User org, User doctor);
    boolean existsByOrgAndDoctor(User org, User doctor);
    void deleteByOrgAndDoctor(User org, User doctor);
}
