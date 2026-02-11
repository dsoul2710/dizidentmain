package com.clinic.hms.repository;

import com.clinic.hms.entity.BillItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillItemRepository extends JpaRepository<BillItem, Long> {
    List<BillItem> findByBill_Id(Long billId);

    List<BillItem> findByBill_IdIn(List<Long> billIds);
}
