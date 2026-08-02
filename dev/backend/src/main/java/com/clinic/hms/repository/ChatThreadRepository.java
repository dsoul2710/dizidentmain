package com.clinic.hms.repository;

import com.clinic.hms.constants.QueryConstants;
import com.clinic.hms.entity.ChatThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatThreadRepository extends JpaRepository<ChatThread, Long> {

    List<ChatThread> findByTypeAndOwner_IdAndDoctor_IdOrderByUpdatedAtDesc(
            String type,
            Long ownerUserId,
            Long doctorUserId
    );

    List<ChatThread> findByTypeAndOwner_IdAndPatient_IdOrderByUpdatedAtDesc(
            String type,
            Long ownerUserId,
            Long patientUserId
    );

    List<ChatThread> findByTypeAndDoctor_IdAndPatient_IdOrderByUpdatedAtDesc(
            String type,
            Long doctorUserId,
            Long patientUserId
    );

    @Query(QueryConstants.ChatThread.FIND_IDS_BY_PATIENT)
    List<Long> findIdsByPatientUserId(@Param("patientUserId") Long patientUserId);

    @Query(QueryConstants.ChatThread.FIND_IDS_BY_DOCTOR)
    List<Long> findIdsByDoctorUserId(@Param("doctorUserId") Long doctorUserId);

    @Query(value = QueryConstants.ChatThread.FIND_IDS_BY_VISIT_NATIVE, nativeQuery = true)
    List<Long> findIdsByVisitId(@Param("visitId") Long visitId);

    @Modifying
    @Query(value = QueryConstants.ChatThread.DELETE_BY_VISIT_NATIVE, nativeQuery = true)
    int deleteByVisitId(@Param("visitId") Long visitId);
}
