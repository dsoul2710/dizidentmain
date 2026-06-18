package com.clinic.hms.repository;

import com.clinic.hms.entity.PatientOrgMapping;
import com.clinic.hms.entity.Patient;
import com.clinic.hms.entity.OrgHospital;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PatientOrgMappingRepository extends JpaRepository<PatientOrgMapping, Long> {
    List<PatientOrgMapping> findByOrg(OrgHospital org);
    List<PatientOrgMapping> findByPatient(Patient patient);
    Optional<PatientOrgMapping> findByOrgAndPatient(OrgHospital org, Patient patient);
    boolean existsByOrgAndPatient(OrgHospital org, Patient patient);
    boolean existsByOrg_IdAndPatient_IdAndStatus(Long orgId, Long patientId, String status);
    void deleteByOrgAndPatient(OrgHospital org, Patient patient);
}
