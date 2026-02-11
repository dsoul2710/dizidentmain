// src/main/java/com/clinic/hms/repository/PrescriptionTemplateRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.PrescriptionTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionTemplateRepository extends JpaRepository<PrescriptionTemplate, Long> {

    // Doctor-specific + global templates (doctor is null)
    List<PrescriptionTemplate> findByDoctor_IdOrDoctorIsNull(Long doctorId);

    // All global templates only
    List<PrescriptionTemplate> findByDoctorIsNull();

    long deleteByDoctor_Id(Long doctorUserId);
}
