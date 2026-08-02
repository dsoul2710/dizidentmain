// src/main/java/com/clinic/hms/repository/InventoryItemRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    Optional<InventoryItem> findByOwner_IdAndItemCode(Long ownerId, String itemCode);

    List<InventoryItem> findByOwner_Id(Long ownerId);

    List<InventoryItem> findByOwner_IdAndCategoryAndIsActiveTrueOrderByNameAsc(Long ownerId, String category);

    List<InventoryItem> findByOwner_IdAndIsActiveTrueOrderByNameAsc(Long ownerId);

    Optional<InventoryItem> findFirstByOwner_IdAndNameIgnoreCase(Long ownerId, String name);

    long deleteByVendor_Id(Long vendorId);
}
