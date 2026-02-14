// src/main/java/com/clinic/hms/dto/response/PrescriptionResponse.java
package com.clinic.hms.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PrescriptionResponse {

    private Long id;

    private LocalDate rxDate;
    private String notes;

    // Visit info
    private Long visitId;

    // Patient
    private Long patientUserId;

    // Doctor
    private Long doctorUserId;
    private String doctorName;

    // Items
    private List<PrescriptionItemResponse> items;
}
