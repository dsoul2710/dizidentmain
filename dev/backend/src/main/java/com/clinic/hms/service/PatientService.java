package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.PatientCreateRequest;
import com.clinic.hms.dto.response.PatientResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.dto.request.PatientUpdateRequest;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import com.clinic.hms.security.SecurityUtils;
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
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    
    private final PatientOrgMappingRepository patientOrgMappingRepository;
    private final PatientDoctorMappingRepository patientDoctorMappingRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRepository visitRepository;
    
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtils securityUtils;

    @Value("${file.upload.base-dir}")
    private String baseUploadDir;

    @Transactional
    public PatientResponse createPatient(PatientCreateRequest req) {
        LocalDateTime now = LocalDateTime.now();
        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {
            // Ignore if seeding or context is empty
        }

        // 1) Create base credentials User
        User user = User.builder()
                .mobile(req.getMobile())
                .password(passwordEncoder.encode(
                        req.getPassword() != null && !req.getPassword().isBlank()
                                ? req.getPassword()
                                : req.getMobile()
                ))
                .role(UserRole.PATIENT)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        user = userRepository.save(user);

        // 2) Create Patient profile details
        Patient patient = Patient.builder()
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
                .uniqueId(generateUniquePatientId())
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(currentUserId)
                .updatedByUserId(currentUserId)
                .isDeleted(false)
                .build();

        patient = patientRepository.save(patient);

        // 3) Create HIPAA mapping: Patient <-> Org
        try {
            Long orgId = securityUtils.getActiveOrgId();
            if (orgId != null) {
                OrgHospital org = orgHospitalRepository.findById(orgId).orElse(null);
                if (org != null) {
                    PatientOrgMapping mapping = PatientOrgMapping.builder()
                            .org(org)
                            .patient(patient)
                            .status(AppConstants.Status.ACTIVE)
                            .createdAt(now)
                            .updatedAt(now)
                            .createdByUserId(currentUserId)
                            .build();
                    patientOrgMappingRepository.save(mapping);
                }
            }
        } catch (Exception e) {
            // Ignore if called outside request context (e.g. seeding)
        }

        // 4) Create HIPAA mapping: Patient <-> Doctor
        try {
            String role = securityUtils.getCurrentUserRole();
            if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(role)) {
                Long docId = securityUtils.getCurrentUserId();
                Doctor doctor = doctorRepository.findById(docId).orElse(null);
                if (doctor != null) {
                    PatientDoctorMapping docMap = PatientDoctorMapping.builder()
                            .doctor(doctor)
                            .patient(patient)
                            .status(AppConstants.Status.ACTIVE)
                            .createdAt(now)
                            .updatedAt(now)
                            .createdByUserId(currentUserId)
                            .build();
                    patientDoctorMappingRepository.save(docMap);
                }
            }

            // Also map explicitly assigned doctor from request if any
            if (req.getAssigned_doctor_id() != null) {
                Doctor assignedDoc = doctorRepository.findById(req.getAssigned_doctor_id()).orElse(null);
                if (assignedDoc != null && (role == null || !req.getAssigned_doctor_id().equals(securityUtils.getCurrentUserId()))) {
                    PatientDoctorMapping docMap = PatientDoctorMapping.builder()
                            .doctor(assignedDoc)
                            .patient(patient)
                            .status(AppConstants.Status.ACTIVE)
                            .createdAt(now)
                            .updatedAt(now)
                            .createdByUserId(currentUserId)
                            .build();
                    patientDoctorMappingRepository.save(docMap);
                }
            }
        } catch (Exception e) {
            // Ignore
        }

        return toDto(patient);
    }

    @Transactional(readOnly = true)
    public PatientResponse getPatientById(Long id) {
        Patient patient = patientRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found or deleted"));
        checkPatientAccess(patient);
        return toDto(patient);
    }

    public void checkPatientAccess(Patient patient) {
        String role = null;
        try {
            role = securityUtils.getCurrentUserRole();
        } catch (Exception e) {}

        if (role == null) {
            throw new SecurityException("Unauthorized access to patient details");
        }

        if (AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role) || "SUPERADMIN".equalsIgnoreCase(role)) {
            return;
        }

        if (AppConstants.Roles.PATIENT.equalsIgnoreCase(role)) {
            if (!patient.getId().equals(securityUtils.getCurrentUserId())) {
                throw new SecurityException("Patients can only access their own profile");
            }
            return;
        }

        if (AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role)) {
            Long orgId = securityUtils.getCurrentUserId();
            boolean hasMapping = patientOrgMappingRepository.existsByOrg_IdAndPatient_IdAndStatus(orgId, patient.getId(), AppConstants.Status.ACTIVE);
            if (!hasMapping) {
                boolean hasHistory = appointmentRepository.existsByPatient_IdAndOwner_Id(patient.getId(), orgId)
                        || visitRepository.existsByPatient_IdAndOwner_Id(patient.getId(), orgId);
                if (!hasHistory) {
                    throw new SecurityException("Organization does not have access to this patient");
                }
            }
            return;
        }

        if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(role)) {
            Long doctorId = securityUtils.getCurrentUserId();
            Long activeOrgId = null;
            try {
                activeOrgId = securityUtils.getActiveOrgId();
            } catch (Exception e) {}

            boolean hasMapping = patientDoctorMappingRepository.existsByDoctorAndPatient(
                    doctorRepository.getReferenceById(doctorId), patient
            );
            if (!hasMapping) {
                boolean hasHistory = appointmentRepository.existsByPatient_IdAndDoctor_Id(patient.getId(), doctorId)
                        || visitRepository.existsByPatient_IdAndDoctor_Id(patient.getId(), doctorId);
                if (!hasHistory) {
                    if (activeOrgId != null) {
                        boolean isOrgMapped = patientOrgMappingRepository.existsByOrg_IdAndPatient_IdAndStatus(activeOrgId, patient.getId(), AppConstants.Status.ACTIVE);
                        if (!isOrgMapped) {
                            throw new SecurityException("Doctor does not have access to this patient");
                        }
                    } else {
                        throw new SecurityException("Doctor does not have access to this patient");
                    }
                }
            }
            return;
        }

        if (AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(role)) {
            Long activeOrgId = null;
            try {
                activeOrgId = securityUtils.getActiveOrgId();
            } catch (Exception e) {}
            if (activeOrgId != null) {
                boolean isOrgMapped = patientOrgMappingRepository.existsByOrg_IdAndPatient_IdAndStatus(activeOrgId, patient.getId(), AppConstants.Status.ACTIVE);
                if (!isOrgMapped) {
                    throw new SecurityException("Service Provider does not have access to this patient");
                }
            } else {
                throw new SecurityException("Service Provider does not have access to this patient");
            }
            return;
        }

        throw new SecurityException("Access denied for patient details");
    }

    @Transactional(readOnly = true)
    public List<PatientResponse> listPatients(Long doctorId) {
        String role = null;
        try {
            role = securityUtils.getCurrentUserRole();
        } catch (Exception e) {}

        if (role == null) {
            return List.of();
        }

        Long orgId = null;
        Long providerId = null;

        if (AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role) || "SUPERADMIN".equalsIgnoreCase(role)) {
            orgId = null;
            providerId = null;
        } else if (AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role)) {
            orgId = securityUtils.getCurrentUserId();
            providerId = null;
        } else if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(role)) {
            doctorId = securityUtils.getCurrentUserId();
            try {
                orgId = securityUtils.getActiveOrgId();
            } catch (Exception e) {}
            providerId = null;
        } else if (AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(role)) {
            providerId = securityUtils.getCurrentUserId();
            try {
                orgId = securityUtils.getActiveOrgId();
            } catch (Exception e) {}
        } else if (AppConstants.Roles.PATIENT.equalsIgnoreCase(role)) {
            Long patientId = securityUtils.getCurrentUserId();
            return patientRepository.findByIdAndIsDeletedFalse(patientId)
                    .stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
        } else {
            return List.of();
        }

        List<Patient> list = patientRepository.listPatients(orgId, doctorId, providerId);
        return list.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PagedResponse<PatientResponse> listPatientsPaged(Long doctorId, String search, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(pageSize, 1);
        PageRequest pageable = PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        String role = null;
        try {
            role = securityUtils.getCurrentUserRole();
        } catch (Exception e) {}

        if (role == null) {
            return PagedResponse.<PatientResponse>builder()
                    .items(List.of())
                    .page(safePage)
                    .pageSize(safeSize)
                    .totalItems(0L)
                    .totalPages(0)
                    .build();
        }

        Long orgId = null;
        Long providerId = null;

        if (AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role) || "SUPERADMIN".equalsIgnoreCase(role)) {
            orgId = null;
            providerId = null;
        } else if (AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role)) {
            orgId = securityUtils.getCurrentUserId();
            providerId = null;
        } else if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(role)) {
            doctorId = securityUtils.getCurrentUserId();
            try {
                orgId = securityUtils.getActiveOrgId();
            } catch (Exception e) {}
            providerId = null;
        } else if (AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(role)) {
            providerId = securityUtils.getCurrentUserId();
            try {
                orgId = securityUtils.getActiveOrgId();
            } catch (Exception e) {}
        } else if (AppConstants.Roles.PATIENT.equalsIgnoreCase(role)) {
            Long patientId = securityUtils.getCurrentUserId();
            List<PatientResponse> items = patientRepository.findByIdAndIsDeletedFalse(patientId)
                    .stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
            return PagedResponse.<PatientResponse>builder()
                    .items(items)
                    .page(1)
                    .pageSize(safeSize)
                    .totalItems((long) items.size())
                    .totalPages(1)
                    .build();
        } else {
            return PagedResponse.<PatientResponse>builder()
                    .items(List.of())
                    .page(safePage)
                    .pageSize(safeSize)
                    .totalItems(0L)
                    .totalPages(0)
                    .build();
        }

        Page<Patient> result = patientRepository.searchPatients(orgId, doctorId, providerId, search, pageable);
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
    public void deletePatient(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient id"));

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {
            // Ignore
        }

        // HIPAA: Do soft-delete to retain clinical records (visits, billing, prescriptions)
        patient.setIsDeleted(true);
        patient.setDeletedAt(LocalDateTime.now());
        patient.setDeletedByUserId(currentUserId);

        // Deactivate user login credentials
        User user = patient.getUser();
        if (user != null) {
            user.setIsActive(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }

        // Set mapping associations to INACTIVE
        List<PatientOrgMapping> orgMappings = patientOrgMappingRepository.findByPatient(patient);
        for (PatientOrgMapping m : orgMappings) {
            m.setStatus(AppConstants.Status.INACTIVE);
            m.setUpdatedAt(LocalDateTime.now());
            patientOrgMappingRepository.save(m);
        }

        List<PatientDoctorMapping> docMappings = patientDoctorMappingRepository.findByPatient(patient);
        for (PatientDoctorMapping m : docMappings) {
            m.setStatus(AppConstants.Status.INACTIVE);
            m.setUpdatedAt(LocalDateTime.now());
            patientDoctorMappingRepository.save(m);
        }

        patientRepository.save(patient);
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

        if (req.getIsActive() != null) {
            user.setIsActive(req.getIsActive());
        }

        Patient patient = patientRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found or deleted"));

        if (req.getName() != null) patient.setFullName(req.getName().trim());
        if (req.getDob() != null && !req.getDob().isBlank()) {
            patient.setDob(LocalDate.parse(req.getDob()));
        } else if (req.getDob() != null) {
            patient.setDob(null);
        }
        if (req.getAge() != null) patient.setAgeYears(req.getAge());
        if (req.getGender() != null) patient.setGender(req.getGender());
        if (req.getCity() != null) patient.setCity(req.getCity());
        if (req.getReferred_by() != null) patient.setReferredBy(req.getReferred_by());
        if (req.getAllergies() != null) patient.setAllergies(req.getAllergies());
        if (req.getMedical_hx() != null) patient.setMedicalHistory(req.getMedical_hx());
        if (req.getPrimary_complaint() != null) patient.setPrimaryComplaint(req.getPrimary_complaint());

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {
            // Ignore
        }

        // Handle updating doctor mappings
        if (req.getAssigned_doctor_id() != null) {
            Doctor assignedDoctor = doctorRepository.findById(req.getAssigned_doctor_id()).orElse(null);
            if (assignedDoctor != null) {
                // Check if mapping already exists
                boolean exists = patientDoctorMappingRepository.existsByDoctorAndPatient(assignedDoctor, patient);
                if (!exists) {
                    // Mark old doctor mappings as inactive
                    List<PatientDoctorMapping> oldMappings = patientDoctorMappingRepository.findByPatient(patient);
                    for (PatientDoctorMapping m : oldMappings) {
                        m.setStatus(AppConstants.Status.INACTIVE);
                        m.setUpdatedAt(LocalDateTime.now());
                        patientDoctorMappingRepository.save(m);
                    }

                    // Create new active mapping
                    PatientDoctorMapping newMapping = PatientDoctorMapping.builder()
                            .patient(patient)
                            .doctor(assignedDoctor)
                            .status(AppConstants.Status.ACTIVE)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .createdByUserId(currentUserId)
                            .build();
                    patientDoctorMappingRepository.save(newMapping);
                }
            }
        }

        LocalDateTime now = LocalDateTime.now();
        user.setUpdatedAt(now);
        patient.setUpdatedAt(now);
        patient.setUpdatedByUserId(currentUserId);

        userRepository.save(user);
        patientRepository.save(patient);

        return toDto(patient);
    }

    @Transactional
    public void uploadIdInsurance(Long patientId, MultipartFile file) throws IOException {
        Patient patient = patientRepository.findByIdAndIsDeletedFalse(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found or deleted"));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file uploaded");
        }

        Path uploadDir = Paths.get(baseUploadDir, "id-insurance");
        Files.createDirectories(uploadDir);

        String filename = "ID_" + patientId + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path target = uploadDir.resolve(filename);

        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        patient.setIdInsuranceFilePath(target.toString());
        patient.setUpdatedAt(LocalDateTime.now());
        try {
            patient.setUpdatedByUserId(securityUtils.getCurrentUserId());
        } catch (Exception e) {}
        patientRepository.save(patient);
    }

    @Transactional
    public void uploadPastReports(Long patientId, List<MultipartFile> files) throws IOException {
        Patient patient = patientRepository.findByIdAndIsDeletedFalse(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found or deleted"));

        List<MultipartFile> safeFiles = files == null
                ? List.of()
                : files.stream().filter(f -> f != null && !f.isEmpty()).toList();
        if (safeFiles.isEmpty()) {
            throw new IllegalArgumentException("No file uploaded");
        }

        List<String> existingPaths = splitPaths(patient.getPastReportsFilePath());
        if (existingPaths.size() + safeFiles.size() > 5) {
            throw new IllegalArgumentException("Maximum 5 reports are allowed.");
        }

        Path uploadDir = Paths.get(baseUploadDir, "past-reports");
        Files.createDirectories(uploadDir);

        List<String> allPaths = new java.util.ArrayList<>(existingPaths);
        for (MultipartFile file : safeFiles) {
            String originalName = file.getOriginalFilename();
            String filename = "REPORT_" + patientId + "_" + System.currentTimeMillis() + "_" + originalName;
            Path target = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            allPaths.add(target.toString());
        }

        patient.setPastReportsFilePath(String.join(",", allPaths));
        patient.setUpdatedAt(LocalDateTime.now());
        try {
            patient.setUpdatedByUserId(securityUtils.getCurrentUserId());
        } catch (Exception e) {}
        patientRepository.save(patient);
    }

    @Transactional(readOnly = true)
    public Patient requirePatientForFiles(Long id) {
        return patientRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient details id"));
    }

    @Transactional(readOnly = true)
    public List<String> listReportFileNames(Long id) {
        Patient patient = requirePatientForFiles(id);
        return splitPaths(patient.getPastReportsFilePath()).stream()
                .map(p -> Paths.get(p).getFileName().toString())
                .toList();
    }

    @Transactional(readOnly = true)
    public String getIdInsuranceFilePath(Long id) {
        return requirePatientForFiles(id).getIdInsuranceFilePath();
    }

    @Transactional(readOnly = true)
    public Path resolveReportFilePath(Long id, String fileName) {
        Patient patient = requirePatientForFiles(id);
        List<String> paths = splitPaths(patient.getPastReportsFilePath());
        if (paths.isEmpty()) {
            throw new IllegalArgumentException("No report files");
        }
        if (fileName != null && !fileName.isBlank()) {
            for (String p : paths) {
                Path candidate = Paths.get(p);
                if (candidate.getFileName().toString().equals(fileName)) {
                    return candidate;
                }
            }
        }
        return Paths.get(paths.get(0));
    }

    private List<String> splitPaths(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return java.util.Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private PatientResponse toDto(Patient p) {
        User u = p.getUser();

        // Get primary doctor for backward compatibility with frontend
        Long assignedDoctorId = patientDoctorMappingRepository.findByPatient(p)
                .stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .map(m -> m.getDoctor().getId())
                .findFirst()
                .orElse(null);

        return PatientResponse.builder()
                .id(p.getId())
                .name(p.getFullName())
                .mobile(u.getMobile())
                .dob(p.getDob() != null ? p.getDob().toString() : null)
                .age(p.getAgeYears())
                .gender(p.getGender())
                .city(p.getCity())
                .referredBy(p.getReferredBy())
                .allergies(p.getAllergies())
                .medicalHistory(p.getMedicalHistory())
                .primaryComplaint(p.getPrimaryComplaint())
                .assignedDoctorId(assignedDoctorId)
                .userId(u.getId())
                .createdAt(p.getCreatedAt() != null ? p.getCreatedAt().toString() : null)
                .hasIdFile(p.getIdInsuranceFilePath() != null && !p.getIdInsuranceFilePath().isBlank())
                .hasReportFile(p.getPastReportsFilePath() != null && !p.getPastReportsFilePath().isBlank())
                .isActive(u.getIsActive())
                .uniqueId(p.getUniqueId())
                .build();
    }

    private String generateUniquePatientId() {
        String uniqueId = AppConstants.PatientId.PREFIX + String.format(AppConstants.PatientId.FORMAT, (int)(Math.random() * AppConstants.PatientId.RANGE));
        while (patientRepository.existsByUniqueId(uniqueId)) {
            uniqueId = AppConstants.PatientId.PREFIX + String.format(AppConstants.PatientId.FORMAT, (int)(Math.random() * AppConstants.PatientId.RANGE));
        }
        return uniqueId;
    }

    /**
     * Platform-wide lookup of a patient by unique ID (PAT-XXXXXX).
     * Used by the "Import Existing Patient" feature for ORG and DOCTOR roles.
     */
    @Transactional(readOnly = true)
    public PatientResponse lookupPatientByUniqueId(String uniqueId) {
        Patient patient = patientRepository.findByUniqueIdAndIsDeletedFalse(uniqueId)
                .orElse(null);
        if (patient == null) {
            return null;
        }
        return toDto(patient);
    }

    /**
     * Import an existing patient into the caller's scope by creating the
     * appropriate PatientOrgMapping and/or PatientDoctorMapping.
     */
    @Transactional
    public PatientResponse importExistingPatient(Long patientUserId, Long assignedDoctorId) {
        Patient patient = patientRepository.findByIdAndIsDeletedFalse(patientUserId)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found or deleted"));

        LocalDateTime now = LocalDateTime.now();
        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        String role = securityUtils.getCurrentUserRole();
        if (role == null) {
            throw new SecurityException("Unauthorized");
        }

        // ORG role: create PatientOrgMapping + optional PatientDoctorMapping
        if (AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role)) {
            Long orgId = securityUtils.getCurrentUserId();
            OrgHospital org = orgHospitalRepository.findById(orgId)
                    .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

            boolean orgMappingExists = patientOrgMappingRepository
                    .existsByOrg_IdAndPatient_IdAndStatus(orgId, patientUserId, AppConstants.Status.ACTIVE);
            if (!orgMappingExists) {
                PatientOrgMapping mapping = PatientOrgMapping.builder()
                        .org(org)
                        .patient(patient)
                        .status(AppConstants.Status.ACTIVE)
                        .createdAt(now)
                        .updatedAt(now)
                        .createdByUserId(currentUserId)
                        .build();
                patientOrgMappingRepository.save(mapping);
            }

            // Optional doctor assignment
            if (assignedDoctorId != null) {
                Doctor assignedDoc = doctorRepository.findById(assignedDoctorId).orElse(null);
                if (assignedDoc != null) {
                    boolean docMappingExists = patientDoctorMappingRepository
                            .existsByDoctorAndPatient(assignedDoc, patient);
                    if (!docMappingExists) {
                        PatientDoctorMapping docMap = PatientDoctorMapping.builder()
                                .doctor(assignedDoc)
                                .patient(patient)
                                .status(AppConstants.Status.ACTIVE)
                                .createdAt(now)
                                .updatedAt(now)
                                .createdByUserId(currentUserId)
                                .build();
                        patientDoctorMappingRepository.save(docMap);
                    }
                }
            }
        }
        // DOCTOR role: create PatientDoctorMapping + PatientOrgMapping if org context
        else if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(role)) {
            Long doctorId = securityUtils.getCurrentUserId();
            Doctor doctor = doctorRepository.findById(doctorId)
                    .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

            boolean docMappingExists = patientDoctorMappingRepository
                    .existsByDoctorAndPatient(doctor, patient);
            if (!docMappingExists) {
                PatientDoctorMapping docMap = PatientDoctorMapping.builder()
                        .doctor(doctor)
                        .patient(patient)
                        .status(AppConstants.Status.ACTIVE)
                        .createdAt(now)
                        .updatedAt(now)
                        .createdByUserId(currentUserId)
                        .build();
                patientDoctorMappingRepository.save(docMap);
            }

            // Also create org mapping if doctor has active org context
            try {
                Long orgId = securityUtils.getActiveOrgId();
                if (orgId != null) {
                    boolean orgMappingExists = patientOrgMappingRepository
                            .existsByOrg_IdAndPatient_IdAndStatus(orgId, patientUserId, AppConstants.Status.ACTIVE);
                    if (!orgMappingExists) {
                        OrgHospital org = orgHospitalRepository.findById(orgId).orElse(null);
                        if (org != null) {
                            PatientOrgMapping mapping = PatientOrgMapping.builder()
                                    .org(org)
                                    .patient(patient)
                                    .status(AppConstants.Status.ACTIVE)
                                    .createdAt(now)
                                    .updatedAt(now)
                                    .createdByUserId(currentUserId)
                                    .build();
                            patientOrgMappingRepository.save(mapping);
                        }
                    }
                }
            } catch (Exception e) {
                // Ignore if no org context
            }
        } else {
            throw new SecurityException("Only ORG and DOCTOR roles can import patients");
        }

        return toDto(patient);
    }
}
