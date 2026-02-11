// src/main/java/com/clinic/hms/dto/request/LabCreateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class LabCreateRequest {
    private String name;
    private String address;
    private String mobile;
}
