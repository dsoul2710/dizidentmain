package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.PrescriptionItemRequest;
import com.clinic.hms.dto.request.PrescriptionRequest;
import com.clinic.hms.dto.response.PrescriptionItemResponse;
import com.clinic.hms.dto.response.PrescriptionResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final UserRepository userRepository;
    private final VisitRepository visitRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PatientDoctorMappingRepository patientDoctorMappingRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;

    @Transactional(readOnly = true)
    public PrescriptionResponse getLatestByVisit(Long visitId) {
        Prescription prescription = prescriptionRepository
                .findTopByVisit_IdOrderByIdDesc(visitId)
                .orElseThrow(() -> new IllegalArgumentException("No prescription found for visit " + visitId));
        List<PrescriptionItem> items =
                prescriptionItemRepository.findByPrescription_Id(prescription.getId());
        return toDto(prescription, items);
    }

    @Transactional
    public PrescriptionResponse createPrescription(PrescriptionRequest req) {

        // 1) Load patient profile
        Patient patient = patientRepository.findByIdAndIsDeletedFalse(req.getPatientUserId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient user id"));

        // 2) Load visit
        Visit visit = visitRepository.findById(req.getVisitId())
                .orElseThrow(() -> new IllegalArgumentException("Visit not found"));

        // 3) Resolve doctor
        Doctor doctor = resolveDoctor(req, visit, patient);

        // 4) Create prescription
        Prescription prescription = Prescription.builder()
                .visit(visit)
                .patient(patient)
                .doctor(doctor)
                .rxDate(req.getRxDate() != null ? req.getRxDate() : LocalDate.now())
                .notes(req.getNotes())
                .createdAt(LocalDateTime.now())
                .build();

        prescription = prescriptionRepository.save(prescription);

        // 5) Create items
        if (req.getItems() != null) {
            for (PrescriptionItemRequest itemReq : req.getItems()) {
                PrescriptionItem item = PrescriptionItem.builder()
                        .prescription(prescription)
                        .medicineName(itemReq.getMedicineName())
                        .medicineContents(itemReq.getMedicineContents())
                        .medicineType(
                                itemReq.getMedicineType() != null
                                        ? itemReq.getMedicineType()
                                        : "tab"
                        )
                        .volume(itemReq.getVolume())
                        .dose(itemReq.getDose())
                        .days(itemReq.getDays())
                        .timings(itemReq.getTimings())
                        .duration(itemReq.getDuration())
                        .instructions(itemReq.getInstructions())
                        .createdAt(LocalDateTime.now())
                        .build();

                prescriptionItemRepository.save(item);
            }
        }

        // 6) Load items for response
        List<PrescriptionItem> items =
                prescriptionItemRepository.findByPrescription_Id(prescription.getId());

        return toDto(prescription, items);
    }

    /**
     * 🔍 Doctor resolution logic:
     *  1) If doctorUserId sent in request → use it
     *  2) Else if visit already has doctor → use that
     *  3) Else if patient has assignedDoctor mapping → use that
     *  4) Else → throw clear error
     */
    private Doctor resolveDoctor(
            PrescriptionRequest req,
            Visit visit,
            Patient patient
    ) {
        // 1) If doctorUserId explicitly sent (doctor panel / future org dropdown)
        if (req.getDoctorUserId() != null) {
            return doctorRepository.findByIdAndIsDeletedFalse(req.getDoctorUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid doctor user id"));
        }

        // 2) If visit already has doctor → use that
        if (visit != null && visit.getDoctor() != null) {
            return visit.getDoctor();
        }

        // 3) If patient has assignedDoctor mapping → use that (ORG flow)
        Doctor assignedDoctor = patientDoctorMappingRepository.findByPatient(patient)
                .stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .map(m -> m.getDoctor())
                .findFirst()
                .orElse(null);
        if (assignedDoctor != null) {
            return assignedDoctor;
        }

        // 4) Still nothing → clear error message
        throw new IllegalArgumentException(
                "Cannot resolve doctor user: doctorUserId not provided, " +
                        "visit has no doctor, and patient has no assignedDoctor mapping."
        );
    }

    // ------------ Mapping helpers ------------

    private PrescriptionResponse toDto(Prescription p, List<PrescriptionItem> items) {
        PrescriptionResponse dto = new PrescriptionResponse();

        dto.setId(p.getId());
        dto.setRxDate(p.getRxDate());
        dto.setNotes(p.getNotes());

        dto.setVisitId(p.getVisit() != null ? p.getVisit().getId() : null);
        dto.setPatientUserId(p.getPatient() != null ? p.getPatient().getId() : null);
        dto.setDoctorUserId(p.getDoctor() != null ? p.getDoctor().getId() : null);
        
        // Get doctor name directly from Doctor profile
        if (p.getDoctor() != null) {
            dto.setDoctorName(p.getDoctor().getFullName());
        }

        dto.setItems(
                items.stream()
                        .map(this::toItemDto)
                        .toList()
        );

        return dto;
    }

    private PrescriptionItemResponse toItemDto(PrescriptionItem item) {
        PrescriptionItemResponse dto = new PrescriptionItemResponse();

        dto.setId(item.getId());
        dto.setMedicineName(item.getMedicineName());
        dto.setMedicineContents(item.getMedicineContents());
        dto.setMedicineType(item.getMedicineType());

        dto.setVolume(item.getVolume());
        dto.setDose(item.getDose());
        dto.setDays(item.getDays());
        dto.setTimings(item.getTimings());
        dto.setDuration(item.getDuration());
        dto.setInstructions(item.getInstructions());

        return dto;
    }
}
