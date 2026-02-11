// src/main/java/com/clinic/hms/repository/PrescriptionItemRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, Long> {
    List<PrescriptionItem> findByPrescription_Id(Long prescriptionId);

    long deleteByPrescription_Id(Long prescriptionId);

}
