// src/main/java/com/clinic/hms/dto/diagnosis/ExamFindingDto.java
package com.clinic.hms.dto;

import lombok.Data;

@Data
public class ExamFindingDto {
    private String itemKey;
    private String title;
    private String description;
    private String section;
    private Boolean abnormal;
}
