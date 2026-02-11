// src/main/java/com/clinic/hms/dto/response/LabResponse.java
package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LabResponse {
    private Long id;
    private String name;
    private String address;
    private String mobile;
    private String createdAt;  // ISO string for React table
}
