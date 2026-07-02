// src/main/java/com/clinic/hms/repository/VisitRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.Visit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface VisitRepository extends JpaRepository<Visit, Long> {

    // by patient user id
    List<Visit> findByPatient_Id(Long patientUserId);

    // delete all visits for a patient user id
    long deleteByPatient_Id(Long patientUserId);


    List<Visit> findByPatient(User patient);

    List<Visit> findTop50ByOrderByCreatedAtDesc();

    List<Visit> findTop50ByPatient_IdOrderByCreatedAtDesc(Long patientUserId);

    List<Visit> findTop50ByDoctor_IdOrderByCreatedAtDesc(Long doctorUserId);

    @Modifying
    @Query(QueryConstants.Visit.CLEAR_DOCTOR)
    int clearDoctorByDoctorId(@Param("doctorUserId") Long doctorUserId);

    boolean existsByPatient_IdAndOwner_Id(Long patientId, Long ownerId);

    boolean existsByPatient_IdAndDoctor_Id(Long patientId, Long doctorId);

    List<Visit> findByOwner_Id(Long ownerId);

    List<Visit> findByDoctor_Id(Long doctorId);

    @Query("SELECT v FROM Visit v WHERE v.patient.id IN :patientIds")
    List<Visit> findByPatient_IdIn(@Param("patientIds") Collection<Long> patientIds);

}
