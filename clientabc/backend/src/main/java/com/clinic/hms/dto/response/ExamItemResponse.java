package com.clinic.hms.dto.response;

import lombok.Data;

@Data
public class ExamItemResponse {

    private Long id;
    private String itemKey;
    private String title;
    private String defaultText;
    private Integer displayOrder;
    private Boolean isActive;
}
