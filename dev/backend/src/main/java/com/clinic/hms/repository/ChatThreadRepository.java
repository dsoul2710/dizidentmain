package com.clinic.hms.repository;

import com.clinic.hms.entity.ChatThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatThreadRepository extends JpaRepository<ChatThread, Long> {

    List<ChatThread> findByTypeAndAdmin_IdAndDoctor_IdOrderByUpdatedAtDesc(
            String type,
            Long adminUserId,
            Long doctorUserId
    );

    List<ChatThread> findByTypeAndAdmin_IdAndPatient_IdOrderByUpdatedAtDesc(
            String type,
            Long adminUserId,
            Long patientUserId
    );

    List<ChatThread> findByTypeAndDoctor_IdAndPatient_IdOrderByUpdatedAtDesc(
            String type,
            Long doctorUserId,
            Long patientUserId
    );

    @Query("select t.id from ChatThread t where t.patient.id = :patientUserId")
    List<Long> findIdsByPatientUserId(@Param("patientUserId") Long patientUserId);

    @Query("select t.id from ChatThread t where t.doctor.id = :doctorUserId")
    List<Long> findIdsByDoctorUserId(@Param("doctorUserId") Long doctorUserId);

    @Query(value = "select id from chat_threads where visit_id = :visitId", nativeQuery = true)
    List<Long> findIdsByVisitId(@Param("visitId") Long visitId);

    @Modifying
    @Query(value = "delete from chat_threads where visit_id = :visitId", nativeQuery = true)
    int deleteByVisitId(@Param("visitId") Long visitId);
}
