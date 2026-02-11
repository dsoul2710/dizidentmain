// src/main/java/com/clinic/hms/repository/VisitExaminationItemRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.VisitExaminationItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VisitExaminationItemRepository extends JpaRepository<VisitExaminationItem, Long> {

    List<VisitExaminationItem> findByVisitId(Long visitId);

    void deleteByVisitId(Long visitId);

    Optional<VisitExaminationItem> findByVisitIdAndExamItemItemKey(Long visitId, String itemKey);

}
