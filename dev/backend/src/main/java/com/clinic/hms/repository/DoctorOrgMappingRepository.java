package com.clinic.hms.repository;

import com.clinic.hms.entity.DoctorOrgMapping;
import com.clinic.hms.entity.Doctor;
import com.clinic.hms.entity.OrgHospital;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DoctorOrgMappingRepository extends JpaRepository<DoctorOrgMapping, Long> {
    List<DoctorOrgMapping> findByOrg(OrgHospital org);
    List<DoctorOrgMapping> findByDoctor(Doctor doctor);
    Optional<DoctorOrgMapping> findByOrgAndDoctor(OrgHospital org, Doctor doctor);
    boolean existsByOrgAndDoctor(OrgHospital org, Doctor doctor);
    boolean existsByOrg_IdAndDoctor_IdAndStatus(Long orgId, Long doctorId, String status);
    void deleteByOrgAndDoctor(OrgHospital org, Doctor doctor);
}
