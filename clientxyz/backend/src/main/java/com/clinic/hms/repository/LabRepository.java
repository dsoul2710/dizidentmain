// src/main/java/com/clinic/hms/repository/LabRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.Lab;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LabRepository extends JpaRepository<Lab, Long> {
    @Query(
            value = """
                    select l from Lab l
                    where :q is null or :q = '' or
                      lower(l.name) like lower(concat('%', :q, '%')) or
                      lower(l.address) like lower(concat('%', :q, '%')) or
                      lower(l.mobile) like lower(concat('%', :q, '%'))
                    """,
            countQuery = """
                    select count(l) from Lab l
                    where :q is null or :q = '' or
                      lower(l.name) like lower(concat('%', :q, '%')) or
                      lower(l.address) like lower(concat('%', :q, '%')) or
                      lower(l.mobile) like lower(concat('%', :q, '%'))
                    """
    )
    Page<Lab> searchLabs(@Param("q") String query, Pageable pageable);

    java.util.List<Lab> findByOrg_Id(Long orgId);

    @Query(
            value = """
                    select l from Lab l
                    where (l.org.id = :orgId) and (:q is null or :q = '' or
                      lower(l.name) like lower(concat('%', :q, '%')) or
                      lower(l.address) like lower(concat('%', :q, '%')) or
                      lower(l.mobile) like lower(concat('%', :q, '%')))
                    """,
            countQuery = """
                    select count(l) from Lab l
                    where (l.org.id = :orgId) and (:q is null or :q = '' or
                      lower(l.name) like lower(concat('%', :q, '%')) or
                      lower(l.address) like lower(concat('%', :q, '%')) or
                      lower(l.mobile) like lower(concat('%', :q, '%')))
                    """
    )
    Page<Lab> searchLabsByOrg(@Param("orgId") Long orgId, @Param("q") String query, Pageable pageable);
}
