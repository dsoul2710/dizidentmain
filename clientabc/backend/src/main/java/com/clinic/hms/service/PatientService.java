package com.clinic.hms.service;

import com.clinic.hms.dto.request.PatientCreateRequest;
import com.clinic.hms.dto.response.PatientResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.dto.request.PatientUpdateRequest;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.entity.Prescription;
import com.clinic.hms.entity.Bill;
import com.clinic.hms.repository.UserDetailsRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.repository.VisitRepository;
import com.clinic.hms.repository.VisitExaminationItemRepository;
import com.clinic.hms.repository.VisitTreatmentItemRepository;
import com.clinic.hms.repository.PrescriptionRepository;
import com.clinic.hms.repository.PrescriptionItemRepository;
import com.clinic.hms.repository.BillRepository;
import com.clinic.hms.repository.BillItemRepository;
import com.clinic.hms.repository.BillPaymentRepository;
import com.clinic.hms.repository.AppointmentRepository;
import com.clinic.hms.repository.ChatThreadRepository;
import com.clinic.hms.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final VisitRepository visitRepository;
    private final VisitExaminationItemRepository visitExaminationItemRepository;
    private final VisitTreatmentItemRepository visitTreatmentItemRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final BillRepository billRepository;
    private final BillItemRepository billItemRepository;
    private final BillPaymentRepository billPaymentRepository;
    private final AppointmentRepository appointmentRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.clinic.hms.security.SecurityUtils securityUtils;
    private final com.clinic.hms.repository.OrgPatientMappingRepository orgPatientMappingRepository;
    private final com.clinic.hms.repository.DoctorPatientMappingRepository doctorPatientMappingRepository;

    @Value("${file.upload.base-dir}")
    private String baseUploadDir;

    @Transactional
    public PatientResponse createPatient(PatientCreateRequest req) {
        LocalDateTime now = LocalDateTime.now();

        User user = User.builder()
                .mobile(req.getMobile())
                .password(passwordEncoder.encode(
                        req.getPassword() != null && !req.getPassword().isBlank()
                                ? req.getPassword()
                                : req.getMobile()
                ))
                .role("PATIENT")
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        user = userRepository.save(user);

        // 2) Optional: assigned doctor
        User assignedDoctor = null;
        if (req.getAssigned_doctor_id() != null) {
            assignedDoctor = userRepository.findById(req.getAssigned_doctor_id())
                    .orElse(null);
        }

        UserDetails details = UserDetails.builder()
                .user(user)
                .fullName(req.getName())
                .dob(req.getDob() != null && !req.getDob().isBlank()
                        ? LocalDate.parse(req.getDob())
                        : null)
                .ageYears(req.getAge())
                .gender(req.getGender())
                .city(req.getCity())
                .referredBy(req.getReferred_by())
                .allergies(req.getAllergies())
                .medicalHistory(req.getMedical_hx())
                .primaryComplaint(req.getPrimary_complaint())
                .assignedDoctor(assignedDoctor)
                .createdAt(now)
                .updatedAt(now)
                .build();

        details = userDetailsRepository.save(details);

        try {
            Long orgId = securityUtils.getActiveOrgId();
            if (orgId != null) {
                User org = userRepository.findById(orgId).orElse(null);
                if (org != null) {
                    com.clinic.hms.entity.OrgPatientMapping mapping = com.clinic.hms.entity.OrgPatientMapping.builder()
                            .org(org)
                            .patient(user)
                            .createdAt(LocalDateTime.now())
                            .build();
                    orgPatientMappingRepository.save(mapping);
                }
            }

            String role = securityUtils.getCurrentUserRole();
            if ("DOCTOR".equalsIgnoreCase(role)) {
                User doctor = securityUtils.getCurrentUser();
                if (doctor != null) {
                    com.clinic.hms.entity.DoctorPatientMapping docMap = com.clinic.hms.entity.DoctorPatientMapping.builder()
                            .doctor(doctor)
                            .patient(user)
                            .createdAt(LocalDateTime.now())
                            .build();
                    doctorPatientMappingRepository.save(docMap);
                }
            }
        } catch (Exception e) {
            // Ignore if no security context exists (e.g. seeding)
        }

        return toDto(details);
    }


    @Transactional(readOnly = true)
    public List<PatientResponse> listPatients(Long doctorId) {
        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore if called outside request context (e.g. testing)
        }

        final Long finalOrgId = orgId;
        List<UserDetails> list = userDetailsRepository.findByUserRoleOrderByCreatedAtDesc("PATIENT");
        return list.stream()
                .filter(details -> {
                    if (finalOrgId != null) {
                        boolean exists = orgPatientMappingRepository.existsByOrgAndPatient(
                                userRepository.findById(finalOrgId).orElse(null),
                                details.getUser()
                        );
                        if (!exists) return false;
                    }
                    if (doctorId == null) return true;
                    User assigned = details.getAssignedDoctor();
                    if (assigned == null) return false;
                    Long assignedUserId =   assigned.getId();
                    return doctorId.equals(assignedUserId);
                })
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PagedResponse<PatientResponse> listPatientsPaged(Long doctorId, String search, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(pageSize, 1);
        PageRequest pageable = PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            // Ignore if no active org is set
        }

        Page<UserDetails> result = userDetailsRepository.searchPatients("PATIENT", orgId, doctorId, search, pageable);
        List<PatientResponse> items = result.getContent()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return PagedResponse.<PatientResponse>builder()
                .items(items)
                .page(safePage)
                .pageSize(safeSize)
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }


    @Transactional
    public void deletePatient(Long userDetailsId) {
        UserDetails details = userDetailsRepository.findFirstByUser_Id(userDetailsId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient details id"));

        Long patientUserId = details.getUser().getId();

        // delete appointments for patient first (includes visit-linked appointments)
        appointmentRepository.deleteByPatient_Id(patientUserId);

        // delete visit-linked data in a safe order
        List<Visit> visits = visitRepository.findByPatient_Id(patientUserId);
        Set<Long> chatThreadIds = new HashSet<>(chatThreadRepository.findIdsByPatientUserId(patientUserId));
        for (Visit visit : visits) {
            Long visitId = visit.getId();
            if (visitId == null) continue;

            visitExaminationItemRepository.deleteByVisitId(visitId);
            visitTreatmentItemRepository.deleteByVisitId(visitId);

            List<Prescription> prescriptions = prescriptionRepository.findByVisit_Id(visitId);
            for (Prescription rx : prescriptions) {
                if (rx.getId() != null) {
                    prescriptionItemRepository.deleteByPrescription_Id(rx.getId());
                }
            }
            prescriptionRepository.deleteAll(prescriptions);

            List<Bill> bills = billRepository.findByVisit_Id(visitId);
            for (Bill bill : bills) {
                if (bill.getId() == null) continue;
                billPaymentRepository.deleteAll(billPaymentRepository.findByBill_Id(bill.getId()));
                billItemRepository.deleteAll(billItemRepository.findByBill_Id(bill.getId()));
            }
            billRepository.deleteAll(bills);

            chatThreadIds.addAll(chatThreadRepository.findIdsByVisitId(visitId));
        }

        for (Long threadId : chatThreadIds) {
            chatMessageRepository.deleteByThread_Id(threadId);
        }
        if (!chatThreadIds.isEmpty()) {
            chatThreadRepository.deleteAllById(chatThreadIds);
        }

        visitRepository.deleteAll(visits);

        // delete userDetails
        userDetailsRepository.delete(details);

        // delete user
        userRepository.deleteById(patientUserId);
    }

    @Transactional
    public PatientResponse updatePatient(Long userId, PatientUpdateRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Patient user not found"));

        if (req.getMobile() != null) {
            String mobile = req.getMobile().trim();
            if (!mobile.isBlank() && !mobile.equals(user.getMobile())) {
                userRepository.findByMobile(mobile)
                        .ifPresent(u -> {
                            throw new IllegalArgumentException("Mobile already registered: " + mobile);
                        });
                user.setMobile(mobile);
            }
        }
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.getPassword()));
        }

        UserDetails details = userDetailsRepository.findFirstByUser_Id(userId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient details id"));

        if (req.getName() != null) details.setFullName(req.getName().trim());
        if (req.getDob() != null && !req.getDob().isBlank()) {
            details.setDob(LocalDate.parse(req.getDob()));
        } else if (req.getDob() != null) {
            details.setDob(null);
        }
        if (req.getAge() != null) details.setAgeYears(req.getAge());
        if (req.getGender() != null) details.setGender(req.getGender());
        if (req.getCity() != null) details.setCity(req.getCity());
        if (req.getReferred_by() != null) details.setReferredBy(req.getReferred_by());
        if (req.getAllergies() != null) details.setAllergies(req.getAllergies());
        if (req.getMedical_hx() != null) details.setMedicalHistory(req.getMedical_hx());
        if (req.getPrimary_complaint() != null) details.setPrimaryComplaint(req.getPrimary_complaint());

        if (req.getAssigned_doctor_id() != null) {
            User assignedDoctor = userRepository.findById(req.getAssigned_doctor_id())
                    .orElse(null);
            details.setAssignedDoctor(assignedDoctor);
        } else if (req.getAssigned_doctor_id() == null) {
            details.setAssignedDoctor(null);
        }

        LocalDateTime now = LocalDateTime.now();
        user.setUpdatedAt(now);
        details.setUpdatedAt(now);

        userRepository.save(user);
        userDetailsRepository.save(details);

        return toDto(details);
    }

    @Transactional
    public void uploadIdInsurance(Long userDetailsId, MultipartFile file) throws IOException {
        UserDetails details = userDetailsRepository.findFirstByUser_Id(userDetailsId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient details id"));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file uploaded");
        }

        // D:/clinic-hms/uploads/id-insurance
        Path uploadDir = Paths.get(baseUploadDir, "id-insurance");
        Files.createDirectories(uploadDir);

        String filename = "ID_" + userDetailsId + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path target = uploadDir.resolve(filename);

        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        details.setIdInsuranceFilePath(target.toString());
        details.setUpdatedAt(LocalDateTime.now());
        userDetailsRepository.save(details);
    }

    @Transactional
    public void uploadPastReports(Long userDetailsId, List<MultipartFile> files) throws IOException {
        UserDetails details = userDetailsRepository.findFirstByUser_Id(userDetailsId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient details id"));

        List<MultipartFile> safeFiles = files == null
                ? List.of()
                : files.stream().filter(f -> f != null && !f.isEmpty()).toList();
        if (safeFiles.isEmpty()) {
            throw new IllegalArgumentException("No file uploaded");
        }

        List<String> existingPaths = splitPaths(details.getPastReportsFilePath());
        if (existingPaths.size() + safeFiles.size() > 5) {
            throw new IllegalArgumentException("Maximum 5 reports are allowed.");
        }

        // D:/clinic-hms/uploads/past-reports
        Path uploadDir = Paths.get(baseUploadDir, "past-reports");
        Files.createDirectories(uploadDir);

        List<String> allPaths = new java.util.ArrayList<>(existingPaths);
        for (MultipartFile file : safeFiles) {
            String originalName = file.getOriginalFilename();
            String filename = "REPORT_" + userDetailsId + "_" + System.currentTimeMillis() + "_" + originalName;
            Path target = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            allPaths.add(target.toString());
        }

        details.setPastReportsFilePath(String.join(",", allPaths));
        details.setUpdatedAt(LocalDateTime.now());
        userDetailsRepository.save(details);
    }

    private List<String> splitPaths(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return java.util.Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private PatientResponse toDto(UserDetails d) {
        User u = d.getUser();

        return PatientResponse.builder()
                .id(d.getId())
                .name(d.getFullName())
                .mobile(u.getMobile())
                .dob(d.getDob() != null ? d.getDob().toString() : null)
                .age(d.getAgeYears())
                .gender(d.getGender())
                .city(d.getCity())
                .referredBy(d.getReferredBy())
                .allergies(d.getAllergies())
                .medicalHistory(d.getMedicalHistory())
                .primaryComplaint(d.getPrimaryComplaint())
                .assignedDoctorId(
                        d.getAssignedDoctor() != null ? d.getAssignedDoctor().getId() : null
                )
                .userId(u.getId())
                .createdAt(d.getCreatedAt() != null ? d.getCreatedAt().toString() : null)
                .hasIdFile(d.getIdInsuranceFilePath() != null && !d.getIdInsuranceFilePath().isBlank())
                .hasReportFile(d.getPastReportsFilePath() != null && !d.getPastReportsFilePath().isBlank())
                .build();
    }
}
