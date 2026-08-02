package com.clinic.hms.repository;

import com.clinic.hms.entity.ServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
    List<ServiceOrder> findByRequester_Id(Long requesterId);
    List<ServiceOrder> findByFulfillmentProvider_Id(Long providerId);
    List<ServiceOrder> findByPatient_Id(Long patientId);
}
