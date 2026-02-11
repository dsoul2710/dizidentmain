// src/main/java/com/clinic/hms/repository/PrescriptionRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    Optional<Prescription> findTopByVisit_IdOrderByIdDesc(Long visitId);
    List<Prescription> findByVisit_Id(Long visitId);
    List<Prescription> findByDoctor_Id(Long doctorUserId);
}
