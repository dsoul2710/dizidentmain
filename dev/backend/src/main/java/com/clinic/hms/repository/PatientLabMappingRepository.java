package com.clinic.hms.repository;

import com.clinic.hms.entity.PatientLabMapping;
import com.clinic.hms.entity.Patient;
import com.clinic.hms.entity.ServiceProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PatientLabMappingRepository extends JpaRepository<PatientLabMapping, Long> {
    List<PatientLabMapping> findByLab(ServiceProvider lab);
    List<PatientLabMapping> findByPatient(Patient patient);
    Optional<PatientLabMapping> findByLabAndPatient(ServiceProvider lab, Patient patient);
    boolean existsByLabAndPatient(ServiceProvider lab, Patient patient);
    void deleteByLabAndPatient(ServiceProvider lab, Patient patient);
}
