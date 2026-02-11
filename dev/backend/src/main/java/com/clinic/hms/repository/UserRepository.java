package com.clinic.hms.repository;

import com.clinic.hms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByMobile(String mobile);

    boolean existsByMobile(String mobile);

    List<User> findByRole(String role);   // ⬅ we'll use this for doctors


}
