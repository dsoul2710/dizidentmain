// src/main/java/com/clinic/hms/dto/request/DoctorUpdateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class DoctorUpdateRequest {
    private String name;
    private String mobile;
    private String speciality;
    private String password;
}
