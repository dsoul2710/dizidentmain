package com.clinic.hms.repository;

import com.clinic.hms.entity.SuperAdmin;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SuperAdminRepository extends JpaRepository<SuperAdmin, Long> {
}
