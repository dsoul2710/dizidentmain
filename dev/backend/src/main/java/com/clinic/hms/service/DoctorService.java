// src/main/java/com/clinic/hms/service/DoctorService.java
package com.clinic.hms.service;

import com.clinic.hms.dto.request.DoctorCreateRequest;
import com.clinic.hms.dto.request.DoctorUpdateRequest;
import com.clinic.hms.dto.response.DoctorResponse;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import com.clinic.hms.repository.UserDetailsRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.repository.AppointmentRepository;
import com.clinic.hms.repository.VisitRepository;
import com.clinic.hms.repository.BillRepository;
import com.clinic.hms.repository.PrescriptionRepository;
import com.clinic.hms.repository.PrescriptionItemRepository;
import com.clinic.hms.repository.PrescriptionTemplateRepository;
import com.clinic.hms.repository.ChatThreadRepository;
import com.clinic.hms.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppointmentRepository appointmentRepository;
    private final VisitRepository visitRepository;
    private final BillRepository billRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final PrescriptionTemplateRepository prescriptionTemplateRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final ChatMessageRepository chatMessageRepository;

    private static final String ROLE_DOCTOR = "DOCTOR";

    @Transactional
    public DoctorResponse createDoctor(DoctorCreateRequest req) {

        // 1) Mobile unique check
        userRepository.findByMobile(req.getMobile())
                .ifPresent(u -> {
                    throw new IllegalArgumentException("Mobile already registered: " + req.getMobile());
                });

        LocalDateTime now = LocalDateTime.now();

        // 2) Create User row
        User user = User.builder()
                .mobile(req.getMobile())
                .password(passwordEncoder.encode(
                        req.getPassword() != null && !req.getPassword().isBlank()
                                ? req.getPassword()
                                : "1234"   // default password; you can change
                ))
                .role(ROLE_DOCTOR)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        user = userRepository.save(user);

        // 3) Create UserDetails row
        UserDetails details = UserDetails.builder()
                .user(user)
                .fullName(req.getName())
                .speciality(req.getSpeciality())
                .createdAt(now)
                .updatedAt(now)
                .build();

        details = userDetailsRepository.save(details);

        return DoctorResponse.builder()
                .id(user.getId())               // doctor userId
                .name(details.getFullName())
                .mobile(user.getMobile())
                .speciality(details.getSpeciality())
                .createdAt(now.toString())
                .build();
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> listDoctors() {
        List<User> doctorUsers = userRepository.findByRole(ROLE_DOCTOR);

        return doctorUsers.stream()
                .map(user -> {
                    UserDetails details = userDetailsRepository.findByUser(user)
                            .orElse(null);

                    return DoctorResponse.builder()
                            .id(user.getId())
                            .name(details != null ? details.getFullName() : null)
                            .mobile(user.getMobile())
                            .speciality(details != null ? details.getSpeciality() : null)
                            .createdAt(user.getCreatedAt() != null
                                    ? user.getCreatedAt().toString()
                                    : null)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public com.clinic.hms.dto.response.PagedResponse<DoctorResponse> listDoctorsPaged(String search, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(pageSize, 1);
        PageRequest pageable = PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<UserDetails> result = userDetailsRepository.searchDoctors(ROLE_DOCTOR, search, pageable);
        List<DoctorResponse> items = result.getContent().stream()
                .map(details -> {
                    User user = details.getUser();
                    return DoctorResponse.builder()
                            .id(user.getId())
                            .name(details.getFullName())
                            .mobile(user.getMobile())
                            .speciality(details.getSpeciality())
                            .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                            .build();
                })
                .toList();

        return com.clinic.hms.dto.response.PagedResponse.<DoctorResponse>builder()
                .items(items)
                .page(safePage)
                .pageSize(safeSize)
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Transactional
    public void deleteDoctor(Long doctorUserId) {
        User user = userRepository.findById(doctorUserId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor user not found: " + doctorUserId));

        // Optional: ensure it's really a doctor
        if (!ROLE_DOCTOR.equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("User is not a doctor: " + doctorUserId);
        }

        // Unassign patients linked to this doctor
        userDetailsRepository.clearAssignedDoctor(doctorUserId);

        // Delete appointments linked to this doctor
        appointmentRepository.deleteByDoctor_Id(doctorUserId);

        // Clear doctor from visits and bills to keep patient history
        visitRepository.clearDoctorByDoctorId(doctorUserId);
        billRepository.clearDoctorByDoctorId(doctorUserId);

        // Delete prescriptions and related items for this doctor
        List<com.clinic.hms.entity.Prescription> prescriptions =
                prescriptionRepository.findByDoctor_Id(doctorUserId);
        for (com.clinic.hms.entity.Prescription rx : prescriptions) {
            if (rx.getId() != null) {
                prescriptionItemRepository.deleteByPrescription_Id(rx.getId());
            }
        }
        prescriptionRepository.deleteAll(prescriptions);

        // Delete doctor-specific prescription templates
        prescriptionTemplateRepository.deleteByDoctor_Id(doctorUserId);

        // Delete chat threads and messages linked to this doctor
        List<Long> threadIds = chatThreadRepository.findIdsByDoctorUserId(doctorUserId);
        for (Long threadId : threadIds) {
            chatMessageRepository.deleteByThread_Id(threadId);
        }
        if (!threadIds.isEmpty()) {
            chatThreadRepository.deleteAllById(threadIds);
        }

        // Delete details if exists
        userDetailsRepository.findByUser(user)
                .ifPresent(userDetailsRepository::delete);

        userRepository.delete(user);
    }

    @Transactional
    public DoctorResponse updateDoctor(Long doctorUserId, DoctorUpdateRequest req) {
        User user = userRepository.findById(doctorUserId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor user not found: " + doctorUserId));

        if (!ROLE_DOCTOR.equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("User is not a doctor: " + doctorUserId);
        }

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

        UserDetails details = userDetailsRepository.findByUser(user)
                .orElseGet(() -> UserDetails.builder()
                        .user(user)
                        .createdAt(LocalDateTime.now())
                        .build());

        if (req.getName() != null) {
            details.setFullName(req.getName().trim());
        }
        if (req.getSpeciality() != null) {
            details.setSpeciality(req.getSpeciality().trim());
        }

        LocalDateTime now = LocalDateTime.now();
        user.setUpdatedAt(now);
        details.setUpdatedAt(now);

        userRepository.save(user);
        userDetailsRepository.save(details);

        return DoctorResponse.builder()
                .id(user.getId())
                .name(details.getFullName())
                .mobile(user.getMobile())
                .speciality(details.getSpeciality())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }
}
