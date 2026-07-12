package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AppointmentResponse {

    private Long id;

    private String date;       // "YYYY-MM-DD"
    private String slot;       // "10:30 AM"

    private Long patientUserId;
    private String patientName;
    private String patientMobile;

    private Long doctorUserId;
    private String doctorName;

    private Long visitId;

    private String description; // from reason/notes
    private String status;      // BOOKED / CANCELLED / etc.

    private Long sourceOrgId;
    private String sourceOrgName;
    private SourceType sourceType;
}
