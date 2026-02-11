// src/main/java/com/clinic/hms/dto/request/PrescriptionRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PrescriptionRequest {

    private Long visitId;
    private Long patientUserId;

    // Optional – if null, backend will resolve from visit / assignedDoctor
    private Long doctorUserId;

    private LocalDate rxDate;
    private String notes;

    private List<PrescriptionItemRequest> items;
}
