// src/main/java/com/clinic/hms/dto/VisitCreateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class VisitCreateRequest {

    private Long patientUserId;   // REQUIRED
    private Long doctorUserId;    // optional

    private String visitType;     // NEW / FOLLOWUP / EMERGENCY
    private String chiefComplaint;
    private String notes;
    private Long createdByUserId; // creator user id (optional)
}
