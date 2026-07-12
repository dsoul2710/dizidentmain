package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.DoctorCreateRequest;
import com.clinic.hms.dto.request.DoctorUpdateRequest;
import com.clinic.hms.dto.response.DoctorLookupResponse;
import com.clinic.hms.dto.response.DoctorMyClinicsResponse;
import com.clinic.hms.dto.response.DoctorResponse;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.dto.response.PagedResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.exception.ApiException;
import com.clinic.hms.repository.*;
import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class DoctorService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final DoctorOrgMappingRepository doctorOrgMappingRepository;

    private final PasswordEncoder passwordEncoder;
    private final SecurityUtils securityUtils;

    @Transactional
    public DoctorResponse createDoctor(DoctorCreateRequest req) {
        userRepository.findByMobile(req.getMobile())
                .ifPresent(u -> {
                    throw ApiException.badRequest("Mobile already registered: " + req.getMobile());
                });

        LocalDateTime now = LocalDateTime.now();
        Long currentUserId = safeCurrentUserId();
        String role = securityUtils.getCurrentUserRole();
        Long activeOrgId = safeActiveOrgId();

        boolean hospitalAdmin = isOrgHospital(role);
        boolean superAdmin = isSuperAdmin(role);

        OperationScope scope;
        Long mappingOrgId;

        if (hospitalAdmin) {
            if (activeOrgId == null) {
                throw ApiException.badRequest("Active organization is required");
            }
            scope = OperationScope.INTERNAL;
            mappingOrgId = activeOrgId;
        } else if (superAdmin) {
            if (req.getOperationScope() == null) {
                throw ApiException.badRequest("operationScope is required for Super Admin create");
            }
            scope = req.getOperationScope();
            if (scope == OperationScope.INTERNAL) {
                if (req.getHospitalOrgId() == null) {
                    throw ApiException.badRequest("hospitalOrgId is required when operationScope is INTERNAL");
                }
                if (!orgHospitalRepository.existsById(req.getHospitalOrgId())) {
                    throw ApiException.badRequest("Invalid hospitalOrgId");
                }
                mappingOrgId = req.getHospitalOrgId();
            } else {
                mappingOrgId = null;
            }
        } else {
            scope = OperationScope.INDEPENDENT;
            mappingOrgId = activeOrgId;
        }

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

        String uniqueId = generateUniqueDoctorId();

        Doctor doctor = Doctor.builder()
                .user(user)
                .fullName(req.getName())
                .speciality(req.getSpeciality())
                .uniqueId(uniqueId)
                .operationScope(scope)
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(currentUserId)
                .updatedByUserId(currentUserId)
                .isDeleted(false)
                .build();

        doctor = doctorRepository.save(doctor);

        if (mappingOrgId != null) {
            OrgHospital org = orgHospitalRepository.findById(mappingOrgId).orElse(null);
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

        log.info("doctor_create actorId={} orgId={} uniqueId={} scope={} outcome=CREATED",
                currentUserId, mappingOrgId, uniqueId, scope);

        return toResponse(doctor);
    }

    @Transactional
    public DoctorResponse changeOperationScope(Long doctorUserId, com.clinic.hms.dto.request.OperationScopeChangeRequest req) {
        requireSuperAdmin();
        if (req == null || req.getOperationScope() == null) {
            throw ApiException.badRequest("operationScope is required");
        }

        Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(doctorUserId)
                .orElseThrow(() -> ApiException.notFound("Doctor not found"));

        OperationScope target = req.getOperationScope();
        Long currentUserId = safeCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        if (target == OperationScope.INDEPENDENT) {
            doctor.setOperationScope(OperationScope.INDEPENDENT);
            doctor.setUpdatedAt(now);
            doctor.setUpdatedByUserId(currentUserId);
            doctorRepository.save(doctor);
            log.info("doctor_scope_change actorId={} uniqueId={} action=TO_INDEPENDENT outcome=OK",
                    currentUserId, doctor.getUniqueId());
            return toResponse(doctor);
        }

        // → INTERNAL
        Long hospitalOrgId = req.getHospitalOrgId();
        List<DoctorOrgMapping> mappings = doctorOrgMappingRepository.findByDoctor(doctor);
        List<DoctorOrgMapping> active = mappings.stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .toList();

        if (hospitalOrgId == null) {
            if (active.size() == 1) {
                hospitalOrgId = active.get(0).getOrg().getId();
            } else {
                throw ApiException.badRequest("hospitalOrgId is required when changing to INTERNAL");
            }
        }

        OrgHospital retainOrg = orgHospitalRepository.findById(hospitalOrgId)
                .orElseThrow(() -> ApiException.badRequest("Invalid hospitalOrgId"));

        boolean foundRetain = false;
        for (DoctorOrgMapping m : mappings) {
            if (m.getOrg().getId().equals(hospitalOrgId)) {
                m.setStatus(AppConstants.Status.ACTIVE);
                m.setUpdatedAt(now);
                doctorOrgMappingRepository.save(m);
                foundRetain = true;
            } else if (AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus())) {
                m.setStatus(AppConstants.Status.INACTIVE);
                m.setUpdatedAt(now);
                doctorOrgMappingRepository.save(m);
            }
        }
        if (!foundRetain) {
            DoctorOrgMapping mapping = DoctorOrgMapping.builder()
                    .org(retainOrg)
                    .doctor(doctor)
                    .status(AppConstants.Status.ACTIVE)
                    .createdAt(now)
                    .updatedAt(now)
                    .createdByUserId(currentUserId)
                    .build();
            doctorOrgMappingRepository.save(mapping);
        }

        doctor.setOperationScope(OperationScope.INTERNAL);
        doctor.setUpdatedAt(now);
        doctor.setUpdatedByUserId(currentUserId);
        doctorRepository.save(doctor);

        log.info("doctor_scope_change actorId={} orgId={} uniqueId={} action=TO_INTERNAL outcome=OK",
                currentUserId, hospitalOrgId, doctor.getUniqueId());
        return toResponse(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorLookupResponse lookupForOnboard(String uniqueId) {
        requireOrgAdmin();
        Long orgId = requireActiveOrgId();

        Optional<Doctor> found = doctorRepository.findByUniqueIdAndIsDeletedFalse(uniqueId);
        if (found.isEmpty()) {
            log.info("doctor_lookup actorId={} orgId={} uniqueId={} outcome=NOT_FOUND",
                    safeCurrentUserId(), orgId, uniqueId);
            throw ApiException.notFound("Doctor not found");
        }

        Doctor doctor = found.get();
        if (doctor.getOperationScope() == OperationScope.INTERNAL) {
            boolean boundToCaller = doctorOrgMappingRepository
                    .existsByOrg_IdAndDoctor_IdAndStatus(orgId, doctor.getId(), AppConstants.Status.ACTIVE);
            if (!boundToCaller) {
                log.info("doctor_lookup actorId={} orgId={} uniqueId={} outcome=NOT_FOUND",
                        safeCurrentUserId(), orgId, uniqueId);
                throw ApiException.notFound("Doctor not found");
            }
        }

        Optional<DoctorOrgMapping> mapping = doctorOrgMappingRepository
                .findByOrgAndDoctor(orgHospitalRepository.findById(orgId).orElseThrow(), doctor);
        boolean alreadyLinked = mapping
                .map(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .orElse(false);
        boolean linkable = doctor.getOperationScope() == OperationScope.INDEPENDENT && !alreadyLinked;

        log.info("doctor_lookup actorId={} orgId={} uniqueId={} outcome=OK alreadyLinked={}",
                safeCurrentUserId(), orgId, uniqueId, alreadyLinked);

        return DoctorLookupResponse.builder()
                .uniqueId(doctor.getUniqueId())
                .fullName(doctor.getFullName())
                .speciality(doctor.getSpeciality())
                .operationScope(doctor.getOperationScope())
                .alreadyLinked(alreadyLinked)
                .linkable(linkable)
                .build();
    }

    @Transactional
    public void onboardDoctor(String uniqueId) {
        requireOrgAdmin();
        Long orgId = requireActiveOrgId();

        Doctor doctor = doctorRepository.findByUniqueIdAndIsDeletedFalse(uniqueId)
                .orElseThrow(() -> ApiException.notFound("Doctor not found"));

        if (doctor.getOperationScope() == OperationScope.INTERNAL) {
            boolean boundToCaller = doctorOrgMappingRepository
                    .existsByOrg_IdAndDoctor_IdAndStatus(orgId, doctor.getId(), AppConstants.Status.ACTIVE);
            if (!boundToCaller) {
                log.info("doctor_onboard actorId={} orgId={} uniqueId={} outcome=NOT_FOUND",
                        safeCurrentUserId(), orgId, uniqueId);
                throw ApiException.notFound("Doctor not found");
            }
            log.info("doctor_onboard actorId={} orgId={} uniqueId={} outcome=ALREADY_BOUND",
                    safeCurrentUserId(), orgId, uniqueId);
            throw ApiException.conflict("Doctor is already onboarded at this clinic");
        }

        OrgHospital org = orgHospitalRepository.findById(orgId)
                .orElseThrow(() -> ApiException.badRequest("Invalid active organization"));

        Long currentUserId = safeCurrentUserId();

        Optional<DoctorOrgMapping> existingMapping = doctorOrgMappingRepository.findByOrgAndDoctor(org, doctor);
        if (existingMapping.isPresent()) {
            DoctorOrgMapping mapping = existingMapping.get();
            if (AppConstants.Status.ACTIVE.equalsIgnoreCase(mapping.getStatus())) {
                log.info("doctor_onboard actorId={} orgId={} uniqueId={} outcome=CONFLICT",
                        currentUserId, orgId, uniqueId);
                throw ApiException.conflict("Doctor is already onboarded at this clinic");
            }
            mapping.setStatus(AppConstants.Status.ACTIVE);
            mapping.setUpdatedAt(LocalDateTime.now());
            doctorOrgMappingRepository.save(mapping);
            log.info("doctor_onboard actorId={} orgId={} uniqueId={} outcome=REACTIVATED",
                    currentUserId, orgId, uniqueId);
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
            log.info("doctor_onboard actorId={} orgId={} uniqueId={} outcome=CREATED",
                    currentUserId, orgId, uniqueId);
        }
    }

    @Transactional
    public void unlinkDoctor(Long doctorUserId) {
        requireOrgAdmin();
        Long orgId = requireActiveOrgId();

        Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(doctorUserId)
                .orElseThrow(() -> ApiException.notFound("Doctor not found"));

        OrgHospital org = orgHospitalRepository.findById(orgId)
                .orElseThrow(() -> ApiException.badRequest("Invalid active organization"));

        DoctorOrgMapping mapping = doctorOrgMappingRepository.findByOrgAndDoctor(org, doctor)
                .orElseThrow(() -> ApiException.notFound("Doctor is not linked to this clinic"));

        mapping.setStatus(AppConstants.Status.INACTIVE);
        mapping.setUpdatedAt(LocalDateTime.now());
        doctorOrgMappingRepository.save(mapping);

        log.info("doctor_unlink actorId={} orgId={} uniqueId={} outcome=INACTIVE",
                safeCurrentUserId(), orgId, doctor.getUniqueId());
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> listDoctors() {
        Long orgId = safeActiveOrgId();

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

        Long orgId = safeActiveOrgId();

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
                .orElseThrow(() -> ApiException.notFound("Doctor profile not found: " + doctorUserId));

        Long currentUserId = safeCurrentUserId();

        doctor.setIsDeleted(true);
        doctor.setDeletedAt(LocalDateTime.now());
        doctor.setDeletedByUserId(currentUserId);

        User user = doctor.getUser();
        if (user != null) {
            user.setIsActive(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }

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
                .orElseThrow(() -> ApiException.notFound("Doctor user not found: " + doctorUserId));

        String mobile = req.getMobile() != null ? req.getMobile().trim() : null;
        if (mobile != null && !mobile.isBlank() && !mobile.equals(user.getMobile())) {
            userRepository.findByMobile(mobile)
                    .ifPresent(u -> {
                        throw ApiException.badRequest("Mobile already registered: " + mobile);
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
                .orElseThrow(() -> ApiException.notFound("Doctor profile not found or deleted"));

        if (req.getName() != null) {
            doctor.setFullName(req.getName().trim());
        }
        if (req.getSpeciality() != null) {
            doctor.setSpeciality(req.getSpeciality().trim());
        }

        Long currentUserId = safeCurrentUserId();

        LocalDateTime now = LocalDateTime.now();
        user.setUpdatedAt(now);
        doctor.setUpdatedAt(now);
        doctor.setUpdatedByUserId(currentUserId);

        userRepository.save(user);
        doctorRepository.save(doctor);

        return toResponse(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorMyClinicsResponse getMyClinicsForCurrentDoctor() {
        User user = securityUtils.getCurrentUser();
        if (user == null || user.getRole() != UserRole.DOCTOR) {
            throw ApiException.forbidden("Only authenticated doctors can fetch associated clinics");
        }

        Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(user.getId())
                .orElseThrow(() -> ApiException.notFound("Doctor profile not found"));

        List<OrganizationResponse> clinics = doctorOrgMappingRepository.findByDoctor(doctor).stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .map(mapping -> {
                    OrgHospital org = mapping.getOrg();
                    User orgUser = org.getUser();
                    return OrganizationResponse.builder()
                            .id(org.getId())
                            .name(org.getOrgName())
                            .mobile(orgUser.getMobile())
                            .isActive(orgUser.getIsActive())
                            .createdAt(org.getCreatedAt() != null ? org.getCreatedAt().toString() : null)
                            .build();
                })
                .toList();

        return DoctorMyClinicsResponse.builder()
                .operationScope(doctor.getOperationScope() != null
                        ? doctor.getOperationScope()
                        : OperationScope.INDEPENDENT)
                .clinics(clinics)
                .build();
    }

    private void requireOrgAdmin() {
        String role = securityUtils.getCurrentUserRole();
        if (role == null) {
            throw ApiException.forbidden("Not allowed");
        }
        boolean allowed = isOrgHospital(role) || isSuperAdmin(role);
        if (!allowed) {
            throw ApiException.forbidden("Not allowed");
        }
    }

    private void requireSuperAdmin() {
        if (!isSuperAdmin(securityUtils.getCurrentUserRole())) {
            throw ApiException.forbidden("Not allowed");
        }
    }

    private boolean isSuperAdmin(String role) {
        return AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role)
                || "SUPERADMIN".equalsIgnoreCase(role);
    }

    private boolean isOrgHospital(String role) {
        return AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role)
                || "ORG".equalsIgnoreCase(role);
    }

    private Long requireActiveOrgId() {
        Long orgId = safeActiveOrgId();
        if (orgId == null) {
            throw ApiException.badRequest("Active organization is required");
        }
        return orgId;
    }

    private Long safeActiveOrgId() {
        try {
            return securityUtils.getActiveOrgId();
        } catch (Exception e) {
            return null;
        }
    }

    private Long safeCurrentUserId() {
        try {
            return securityUtils.getCurrentUserId();
        } catch (Exception e) {
            return null;
        }
    }

    private String generateUniqueDoctorId() {
        String uniqueId = AppConstants.DoctorId.PREFIX + String.format(AppConstants.DoctorId.FORMAT, (int) (Math.random() * AppConstants.DoctorId.RANGE));
        while (doctorRepository.findByUniqueIdAndIsDeletedFalse(uniqueId).isPresent()) {
            uniqueId = AppConstants.DoctorId.PREFIX + String.format(AppConstants.DoctorId.FORMAT, (int) (Math.random() * AppConstants.DoctorId.RANGE));
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
                .operationScope(doctor.getOperationScope())
                .build();
    }
}
