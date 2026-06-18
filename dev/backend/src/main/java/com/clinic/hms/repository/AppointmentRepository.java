// src/main/java/com/clinic/hms/repository/AppointmentRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.Appointment;
import com.clinic.hms.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
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

}
