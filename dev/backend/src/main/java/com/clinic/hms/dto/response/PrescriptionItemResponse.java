// src/main/java/com/clinic/hms/dto/response/PrescriptionItemResponse.java
package com.clinic.hms.dto.response;

import lombok.Data;

@Data
public class PrescriptionItemResponse {

    private Long id;

    private String medicineName;
    private String medicineContents;
    private String medicineType;

    private String volume;
    private String dose;
    private String days;
    private String timings;
    private String duration;

    private String instructions;
}
