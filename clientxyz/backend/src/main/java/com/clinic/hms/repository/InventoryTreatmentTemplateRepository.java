// src/main/java/com/clinic/hms/repository/InventoryTreatmentTemplateRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.InventoryTreatmentTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryTreatmentTemplateRepository
        extends JpaRepository<InventoryTreatmentTemplate, Long> {
}
