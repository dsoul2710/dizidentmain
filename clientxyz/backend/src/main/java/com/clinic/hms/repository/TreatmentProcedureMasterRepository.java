package com.clinic.hms.repository;

import com.clinic.hms.entity.TreatmentCategoryMaster;
import com.clinic.hms.entity.TreatmentProcedureMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TreatmentProcedureMasterRepository extends JpaRepository<TreatmentProcedureMaster, Long> {

    List<TreatmentProcedureMaster> findByCategoryIdAndIsActiveTrueOrderByDisplayOrderAscNameAsc(Long categoryId);

    Optional<TreatmentProcedureMaster> findByCategoryAndNameIgnoreCase(TreatmentCategoryMaster category, String name);
}
