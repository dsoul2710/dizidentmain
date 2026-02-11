// src/main/java/com/clinic/hms/dto/response/DoctorResponse.java
package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DoctorResponse {

    private Long id;            // ✅ users.id (doctor userId)
    private String name;
    private String mobile;
    private String speciality;
    private String createdAt;   // ISO string for frontend table
}
