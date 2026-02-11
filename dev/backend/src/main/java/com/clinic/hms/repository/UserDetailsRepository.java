package com.clinic.hms.repository;

import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserDetailsRepository extends JpaRepository<UserDetails, Long> {

    // All patients
    List<UserDetails> findByUserRole(String role);
    List<UserDetails> findByUserRoleOrderByCreatedAtDesc(String role);

    Optional<UserDetails> findFirstByUser_Id(Long userId);

    Optional<UserDetails> findByUser(User user);

    @Modifying
    @Query("update UserDetails d set d.assignedDoctor = null where d.assignedDoctor.id = :doctorUserId")
    int clearAssignedDoctor(@Param("doctorUserId") Long doctorUserId);

    @Query(
            value = """
                    select d from UserDetails d
                    join d.user u
                    where u.role = :role
                      and (:doctorId is null or (d.assignedDoctor is not null and d.assignedDoctor.id = :doctorId))
                      and (
                        :q is null or :q = '' or
                        lower(d.fullName) like lower(concat('%', :q, '%')) or
                        lower(u.mobile) like lower(concat('%', :q, '%')) or
                        lower(d.city) like lower(concat('%', :q, '%')) or
                        lower(d.referredBy) like lower(concat('%', :q, '%'))
                      )
                    """,
            countQuery = """
                    select count(d) from UserDetails d
                    join d.user u
                    where u.role = :role
                      and (:doctorId is null or (d.assignedDoctor is not null and d.assignedDoctor.id = :doctorId))
                      and (
                        :q is null or :q = '' or
                        lower(d.fullName) like lower(concat('%', :q, '%')) or
                        lower(u.mobile) like lower(concat('%', :q, '%')) or
                        lower(d.city) like lower(concat('%', :q, '%')) or
                        lower(d.referredBy) like lower(concat('%', :q, '%'))
                      )
                    """
    )
    Page<UserDetails> searchPatients(
            @Param("role") String role,
            @Param("doctorId") Long doctorId,
            @Param("q") String query,
            Pageable pageable
    );

    @Query(
            value = """
                    select d from UserDetails d
                    join d.user u
                    where u.role = :role
                      and (
                        :q is null or :q = '' or
                        lower(d.fullName) like lower(concat('%', :q, '%')) or
                        lower(d.speciality) like lower(concat('%', :q, '%')) or
                        lower(u.mobile) like lower(concat('%', :q, '%'))
                      )
                    """,
            countQuery = """
                    select count(d) from UserDetails d
                    join d.user u
                    where u.role = :role
                      and (
                        :q is null or :q = '' or
                        lower(d.fullName) like lower(concat('%', :q, '%')) or
                        lower(d.speciality) like lower(concat('%', :q, '%')) or
                        lower(u.mobile) like lower(concat('%', :q, '%'))
                      )
                    """
    )
    Page<UserDetails> searchDoctors(
            @Param("role") String role,
            @Param("q") String query,
            Pageable pageable
    );

}
