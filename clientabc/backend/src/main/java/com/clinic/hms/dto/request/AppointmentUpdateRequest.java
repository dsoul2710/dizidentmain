// src/main/java/com/clinic/hms/dto/request/AppointmentUpdateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class AppointmentUpdateRequest {
    private String date;     // "YYYY-MM-DD"
    private String slot;     // "1:30 PM"
    private Long visitId;    // optional
    private String description;
}
