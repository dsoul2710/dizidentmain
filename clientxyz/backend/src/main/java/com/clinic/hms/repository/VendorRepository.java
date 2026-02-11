// src/main/java/com/clinic/hms/repository/VendorRepository.java
package com.clinic.hms.repository;

import com.clinic.hms.entity.Vendor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VendorRepository extends JpaRepository<Vendor, Long> {
    @Query(
            value = """
                    select v from Vendor v
                    where :q is null or :q = '' or
                      lower(v.name) like lower(concat('%', :q, '%')) or
                      lower(v.address) like lower(concat('%', :q, '%')) or
                      lower(v.mobile) like lower(concat('%', :q, '%')) or
                      lower(v.category) like lower(concat('%', :q, '%')) or
                      lower(v.gstNo) like lower(concat('%', :q, '%'))
                    """,
            countQuery = """
                    select count(v) from Vendor v
                    where :q is null or :q = '' or
                      lower(v.name) like lower(concat('%', :q, '%')) or
                      lower(v.address) like lower(concat('%', :q, '%')) or
                      lower(v.mobile) like lower(concat('%', :q, '%')) or
                      lower(v.category) like lower(concat('%', :q, '%')) or
                      lower(v.gstNo) like lower(concat('%', :q, '%'))
                    """
    )
    Page<Vendor> searchVendors(@Param("q") String query, Pageable pageable);
}
