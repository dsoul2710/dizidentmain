// src/main/java/com/clinic/hms/repository/InventoryItemRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    Optional<InventoryItem> findByItemCode(String itemCode);

    List<InventoryItem> findByOrg_Id(Long orgId);

    List<InventoryItem> findByCategoryAndIsActiveTrueOrderByNameAsc(String category);

    List<InventoryItem> findByIsActiveTrueOrderByNameAsc();

    Optional<InventoryItem> findFirstByNameIgnoreCase(String name);

    long deleteByVendor_Id(Long vendorId);
}
