// src/main/java/com/clinic/hms/dto/request/DoctorCreateRequest.java
package com.clinic.hms.dto.request;

import com.clinic.hms.entity.OperationScope;
import lombok.Data;

@Data
public class DoctorCreateRequest {

    private String name;       // doctor full name
    private String mobile;     // unique
    private String speciality; // e.g. Dentist, Orthodontist

    // optional: allow custom password; if null we'll set default
    private String password;

    /** Super Admin create: INDEPENDENT or INTERNAL. Ignored for Hospital Admin (forced INTERNAL). */
    private OperationScope operationScope;

    /** Required when Super Admin creates INTERNAL. */
    private Long hospitalOrgId;
}
