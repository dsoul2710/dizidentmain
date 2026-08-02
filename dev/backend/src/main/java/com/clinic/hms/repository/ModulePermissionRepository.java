package com.clinic.hms.repository;

import com.clinic.hms.entity.ModulePermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModulePermissionRepository extends JpaRepository<ModulePermission, Long> {
    List<ModulePermission> findByUserId(Long userId);
    Optional<ModulePermission> findByUserIdAndModuleName(Long userId, String moduleName);
    void deleteByUserId(Long userId);
}
