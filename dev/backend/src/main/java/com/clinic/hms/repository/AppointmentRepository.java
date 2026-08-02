package com.clinic.hms.repository;

import com.clinic.hms.entity.Appointment;
import com.clinic.hms.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByAppointmentDate(LocalDate date);

    List<Appointment> findByDoctorAndAppointmentDate(Doctor doctor, LocalDate date);

    List<Appointment> findByAppointmentDateGreaterThanEqualOrderByAppointmentDateAscStartTimeAsc(LocalDate from);

    List<Appointment> findByAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(
            LocalDate from,
            LocalDate to
    );

    List<Appointment> findTop50ByOrderByCreatedAtDesc();

    List<Appointment> findTop50ByPatient_IdOrderByCreatedAtDesc(Long patientUserId);

    List<Appointment> findTop50ByDoctor_IdOrderByCreatedAtDesc(Long doctorUserId);

    long deleteByPatient_Id(Long patientUserId);

    long deleteByVisit_Id(Long visitId);

    long deleteByDoctor_Id(Long doctorUserId);

    boolean existsByPatient_IdAndOwner_Id(Long patientId, Long ownerId);

    boolean existsByPatient_IdAndDoctor_Id(Long patientId, Long doctorId);

    List<Appointment> findByOwner_Id(Long ownerId);

    /**
     * Appointments with a source org for the given doctor and patients,
     * ordered so the first per patient is the latest by date/time.
     */
    @Query("""
            select a from Appointment a
            left join fetch a.sourceOrg
            where a.doctor.id = :doctorId
              and a.patient.id in :patientIds
              and a.sourceOrg is not null
            order by a.appointmentDate desc, a.startTime desc
            """)
    List<Appointment> findSourcedByDoctorAndPatientIds(
            @Param("doctorId") Long doctorId,
            @Param("patientIds") Collection<Long> patientIds
    );
}
