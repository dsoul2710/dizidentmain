package com.clinic.hms.repository;

import com.clinic.hms.entity.ProcedurePriceList;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProcedurePriceListRepository extends JpaRepository<ProcedurePriceList, Long> {
    Optional<ProcedurePriceList> findByOwner_IdAndProcedure_Id(Long ownerId, Long procedureId);
    List<ProcedurePriceList> findByOwner_Id(Long ownerId);
    List<ProcedurePriceList> findByOwner_IdAndIsActiveTrue(Long ownerId);
}
