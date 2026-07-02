package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.DoctorCreateRequest;
import com.clinic.hms.dto.request.DoctorUpdateRequest;
import com.clinic.hms.dto.response.DoctorResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final DoctorOrgMappingRepository doctorOrgMappingRepository;
    
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtils securityUtils;

    @Transactional
    public DoctorResponse createDoctor(DoctorCreateRequest req) {
        // 1) Mobile unique check
        userRepository.findByMobile(req.getMobile())
                .ifPresent(u -> {
                    throw new IllegalArgumentException("Mobile already registered: " + req.getMobile());
                });

        LocalDateTime now = LocalDateTime.now();
        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        // 2) Create User credentials row
        User user = User.builder()
                .mobile(req.getMobile())
                .password(passwordEncoder.encode(
                        req.getPassword() != null && !req.getPassword().isBlank()
                                ? req.getPassword()
                                : "1234"
                ))
                .role(UserRole.DOCTOR)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        user = userRepository.save(user);

        // Generate a unique ID (e.g. DOC-XXXXXX)
        String uniqueId = generateUniqueDoctorId();

        // 3) Create Doctor profile row
        Doctor doctor = Doctor.builder()
                .user(user)
                .fullName(req.getName())
                .speciality(req.getSpeciality())
                .uniqueId(uniqueId)
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(currentUserId)
                .updatedByUserId(currentUserId)
                .isDeleted(false)
                .build();

        doctor = doctorRepository.save(doctor);

        // 4) Map to active Org if registering under an Org
        try {
            Long orgId = securityUtils.getActiveOrgId();
            if (orgId != null) {
                OrgHospital org = orgHospitalRepository.findById(orgId).orElse(null);
                if (org != null) {
                    DoctorOrgMapping mapping = DoctorOrgMapping.builder()
                            .org(org)
                            .doctor(doctor)
                            .status(AppConstants.Status.ACTIVE)
                            .createdAt(now)
                            .updatedAt(now)
                            .createdByUserId(currentUserId)
                            .build();
                    doctorOrgMappingRepository.save(mapping);
                }
            }
        } catch (Exception e) {
            // Ignore
        }

        return toResponse(doctor);
    }

    @Transactional
    public void onboardDoctor(String uniqueId) {
        Long orgId = securityUtils.getActiveOrgId();
        if (orgId == null) {
            throw new IllegalStateException("Only authenticated organizations can onboard doctors");
        }

        Doctor doctor = doctorRepository.findByUniqueIdAndIsDeletedFalse(uniqueId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found with ID: " + uniqueId));

        OrgHospital org = orgHospitalRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid active organization: " + orgId));

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        Optional<DoctorOrgMapping> existingMapping = doctorOrgMappingRepository.findByOrgAndDoctor(org, doctor);
        if (existingMapping.isPresent()) {
            DoctorOrgMapping mapping = existingMapping.get();
            if (AppConstants.Status.ACTIVE.equalsIgnoreCase(mapping.getStatus())) {
                throw new IllegalArgumentException("Doctor is already onboarded at this clinic");
            }
            mapping.setStatus(AppConstants.Status.ACTIVE);
            mapping.setUpdatedAt(LocalDateTime.now());
            doctorOrgMappingRepository.save(mapping);
        } else {
            DoctorOrgMapping mapping = DoctorOrgMapping.builder()
                    .org(org)
                    .doctor(doctor)
                    .status(AppConstants.Status.ACTIVE)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(currentUserId)
                    .build();
            doctorOrgMappingRepository.save(mapping);
        }
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> listDoctors() {
        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {}

        List<Doctor> doctors;
        if (orgId != null) {
            doctors = doctorOrgMappingRepository.findByOrg(
                    orgHospitalRepository.findById(orgId).orElseThrow()
            ).stream()
            .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
            .map(DoctorOrgMapping::getDoctor)
            .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
            .toList();
        } else {
            doctors = doctorRepository.findByIsDeletedFalse();
        }

        return doctors.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<DoctorResponse> listDoctorsPaged(String search, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(pageSize, 1);
        PageRequest pageable = PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {}

        Page<Doctor> result = doctorRepository.searchDoctors(orgId, search, pageable);
        List<DoctorResponse> items = result.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PagedResponse.<DoctorResponse>builder()
                .items(items)
                .page(safePage)
                .pageSize(safeSize)
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Transactional
    public void deleteDoctor(Long doctorUserId) {
        Doctor doctor = doctorRepository.findById(doctorUserId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found: " + doctorUserId));

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        // HIPAA: soft delete
        doctor.setIsDeleted(true);
        doctor.setDeletedAt(LocalDateTime.now());
        doctor.setDeletedByUserId(currentUserId);
        
        User user = doctor.getUser();
        if (user != null) {
            user.setIsActive(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }

        // Set mapping associations to INACTIVE
        List<DoctorOrgMapping> mappings = doctorOrgMappingRepository.findByDoctor(doctor);
        for (DoctorOrgMapping m : mappings) {
            m.setStatus(AppConstants.Status.INACTIVE);
            m.setUpdatedAt(LocalDateTime.now());
            doctorOrgMappingRepository.save(m);
        }

        doctorRepository.save(doctor);
    }

    @Transactional
    public DoctorResponse updateDoctor(Long doctorUserId, DoctorUpdateRequest req) {
        User user = userRepository.findById(doctorUserId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor user not found: " + doctorUserId));

        String mobile = req.getMobile() != null ? req.getMobile().trim() : null;
        if (mobile != null && !mobile.isBlank() && !mobile.equals(user.getMobile())) {
            userRepository.findByMobile(mobile)
                    .ifPresent(u -> {
                        throw new IllegalArgumentException("Mobile already registered: " + mobile);
                    });
            user.setMobile(mobile);
        }
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.getPassword()));
        }

        if (req.getIsActive() != null) {
            user.setIsActive(req.getIsActive());
        }

        Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(doctorUserId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found or deleted"));

        if (req.getName() != null) {
            doctor.setFullName(req.getName().trim());
        }
        if (req.getSpeciality() != null) {
            doctor.setSpeciality(req.getSpeciality().trim());
        }

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        LocalDateTime now = LocalDateTime.now();
        user.setUpdatedAt(now);
        doctor.setUpdatedAt(now);
        doctor.setUpdatedByUserId(currentUserId);

        userRepository.save(user);
        doctorRepository.save(doctor);

        return toResponse(doctor);
    }

    private String generateUniqueDoctorId() {
        String uniqueId = AppConstants.DoctorId.PREFIX + String.format(AppConstants.DoctorId.FORMAT, (int)(Math.random() * AppConstants.DoctorId.RANGE));
        while (doctorRepository.findByUniqueIdAndIsDeletedFalse(uniqueId).isPresent()) {
            uniqueId = AppConstants.DoctorId.PREFIX + String.format(AppConstants.DoctorId.FORMAT, (int)(Math.random() * AppConstants.DoctorId.RANGE));
        }
        return uniqueId;
    }

    private DoctorResponse toResponse(Doctor doctor) {
        return DoctorResponse.builder()
                .id(doctor.getId())
                .name(doctor.getFullName())
                .mobile(doctor.getUser().getMobile())
                .speciality(doctor.getSpeciality())
                .uniqueId(doctor.getUniqueId())
                .createdAt(doctor.getCreatedAt() != null ? doctor.getCreatedAt().toString() : null)
                .isActive(doctor.getUser().getIsActive())
                .build();
    }

    @Transactional(readOnly = true)
    public List<com.clinic.hms.dto.response.OrganizationResponse> getMyClinicsForCurrentDoctor() {
        User user = securityUtils.getCurrentUser();
        if (user == null || user.getRole() != UserRole.DOCTOR) {
            throw new SecurityException("Only authenticated doctors can fetch associated clinics");
        }

        Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        return doctorOrgMappingRepository.findByDoctor(doctor).stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .map(mapping -> {
                    OrgHospital org = mapping.getOrg();
                    User orgUser = org.getUser();
                    return com.clinic.hms.dto.response.OrganizationResponse.builder()
                            .id(org.getId())
                            .name(org.getOrgName())
                            .mobile(orgUser.getMobile())
                            .isActive(orgUser.getIsActive())
                            .createdAt(org.getCreatedAt() != null ? org.getCreatedAt().toString() : null)
                            .build();
                })
                .toList();
    }
}
