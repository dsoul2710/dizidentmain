// src/main/java/com/clinic/hms/dto/PrescriptionTemplateRequest.java
package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class PrescriptionTemplateRequest {

    private String name;

    private String medicineName;
    private String medicineContents;
    private String medicineType;
    private String volume;
    private String dose;
    private String days;
    private String timings;
    private String duration;
    private String instructions;

    private Long doctorUserId; // nullable for global template
}
