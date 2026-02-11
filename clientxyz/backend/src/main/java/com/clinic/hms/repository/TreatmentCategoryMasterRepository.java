package com.clinic.hms.repository;

import com.clinic.hms.entity.TreatmentCategoryMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TreatmentCategoryMasterRepository extends JpaRepository<TreatmentCategoryMaster, Long> {

    Optional<TreatmentCategoryMaster> findByCategoryKey(String categoryKey);

    List<TreatmentCategoryMaster> findByIsActiveTrueOrderByDisplayOrderAscTitleAsc();
}
