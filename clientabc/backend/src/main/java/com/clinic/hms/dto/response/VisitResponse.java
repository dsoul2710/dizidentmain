// src/main/java/com/clinic/hms/dto/VisitResponseDto.java
package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VisitResponse {

    private Long id;

    private Long patientUserId;
    private String patientName;
    private String patientMobile;

    private Long doctorUserId;
    private String doctorName;

    private String visitDate;     // ISO string
    private String visitType;
    private String chiefComplaint;
    private String notes;
    private String status;        // OPEN / COMPLETED / CANCELLED
}
