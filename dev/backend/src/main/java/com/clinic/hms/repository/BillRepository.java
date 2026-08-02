package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {
    Optional<Bill> findTopByOrderByIdDesc();
    Optional<Bill> findTopByVisit_IdOrderByIdDesc(Long visitId);
    List<Bill> findByVisit_Id(Long visitId);

    List<Bill> findTop50ByOrderByCreatedAtDesc();

    List<Bill> findTop50ByPatient_IdOrderByCreatedAtDesc(Long patientUserId);

    List<Bill> findTop50ByDoctor_IdOrderByCreatedAtDesc(Long doctorUserId);

    @Modifying
    @Query(QueryConstants.Bill.CLEAR_DOCTOR)
    int clearDoctorByDoctorId(@Param("doctorUserId") Long doctorUserId);

    List<Bill> findByOwner_Id(Long ownerId);
}
