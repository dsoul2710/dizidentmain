// src/main/java/com/clinic/hms/repository/InventoryMovementRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.InventoryMovement;
import com.clinic.hms.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {

    List<InventoryMovement> findByItemOrderByMovementDateDescMovementTimeDesc(InventoryItem item);

    List<InventoryMovement> findAllByOrderByMovementDateDescMovementTimeDesc();

    List<InventoryMovement> findByItemAndMovementDateBetweenOrderByMovementDateAscMovementTimeAsc(
            InventoryItem item,
            LocalDate from,
            LocalDate to
    );

    List<InventoryMovement> findByMovementDateBetween(LocalDate from, LocalDate to);

    long deleteByItem_Vendor_Id(Long vendorId);
}
