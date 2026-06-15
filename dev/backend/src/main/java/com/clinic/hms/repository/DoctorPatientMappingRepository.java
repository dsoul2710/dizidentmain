package com.clinic.hms.repository;

import com.clinic.hms.entity.DoctorPatientMapping;
import com.clinic.hms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DoctorPatientMappingRepository extends JpaRepository<DoctorPatientMapping, Long> {
    List<DoctorPatientMapping> findByDoctor(User doctor);
    List<DoctorPatientMapping> findByPatient(User patient);
    Optional<DoctorPatientMapping> findByDoctorAndPatient(User doctor, User patient);
    boolean existsByDoctorAndPatient(User doctor, User patient);
    void deleteByDoctorAndPatient(User doctor, User patient);
}
