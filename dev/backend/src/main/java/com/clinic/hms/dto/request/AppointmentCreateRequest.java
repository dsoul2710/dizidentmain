// src/main/java/com/clinic/hms/dto/request/AppointmentCreateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class AppointmentCreateRequest {

    private String date;          // "YYYY-MM-DD"
    private String slot;          // "10:30 AM"
    private Long patientUserId;   // patient user id
    private Long doctorUserId;    // doctor user id (from frontend or security)
    private Long visitId;         // optional
    private String description;   // reason / notes
    private Long createdByUserId; // creator user id (optional)
}
