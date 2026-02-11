package com.clinic.hms.repository;

import com.clinic.hms.entity.BillPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillPaymentRepository extends JpaRepository<BillPayment, Long> {
    List<BillPayment> findByBill_Id(Long billId);

    List<BillPayment> findByBill_IdIn(List<Long> billIds);
}
