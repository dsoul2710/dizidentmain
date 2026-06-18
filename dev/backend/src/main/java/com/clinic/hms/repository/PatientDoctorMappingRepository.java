package com.clinic.hms.repository;

import com.clinic.hms.entity.PatientDoctorMapping;
import com.clinic.hms.entity.Patient;
import com.clinic.hms.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PatientDoctorMappingRepository extends JpaRepository<PatientDoctorMapping, Long> {
    List<PatientDoctorMapping> findByDoctor(Doctor doctor);
    List<PatientDoctorMapping> findByPatient(Patient patient);
    Optional<PatientDoctorMapping> findByDoctorAndPatient(Doctor doctor, Patient patient);
    boolean existsByDoctorAndPatient(Doctor doctor, Patient patient);
    void deleteByDoctorAndPatient(Doctor doctor, Patient patient);
}
