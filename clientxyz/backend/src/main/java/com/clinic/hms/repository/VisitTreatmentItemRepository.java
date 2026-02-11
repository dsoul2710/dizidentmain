package com.clinic.hms.repository;

import com.clinic.hms.entity.VisitTreatmentItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VisitTreatmentItemRepository extends JpaRepository<VisitTreatmentItem, Long> {
    List<VisitTreatmentItem> findByVisitId(Long visitId);
    List<VisitTreatmentItem> findByVisitIdIn(List<Long> visitIds);
    void deleteByVisitId(Long visitId);
}
