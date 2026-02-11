package com.clinic.hms.repository;

import com.clinic.hms.entity.ExamItemMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamItemMasterRepository extends JpaRepository<ExamItemMaster, Long> {

    Optional<ExamItemMaster> findByItemKey(String itemKey);

    List<ExamItemMaster> findByIsActiveTrueOrderByDisplayOrderAscIdAsc();
}
