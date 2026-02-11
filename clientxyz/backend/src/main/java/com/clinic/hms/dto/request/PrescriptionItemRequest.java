// src/main/java/com/clinic/hms/dto/request/PrescriptionItemRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class PrescriptionItemRequest {

    private String medicineName;
    private String medicineContents;
    private String medicineType;  // tab / syrup / powder

    private String volume;        // e.g. "10 tab", "100 ml"
    private String dose;          // e.g. "1-0-1"
    private String days;          // e.g. "5 days"
    private String timings;       // e.g. "After meal"
    private String duration;      // e.g. "5 days" or "1 week"

    private String instructions;  // free text
}
