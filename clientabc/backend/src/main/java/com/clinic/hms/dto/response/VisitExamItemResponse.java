package com.clinic.hms.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class VisitExamItemResponse {

    private Long id;
    private Long visitId;

    private String itemKey;           // master key (caries, gingiva, ...)
    private String title;             // master title
    private String text;              // saved description

    private String odontogramMode;    // adult/child
    private List<String> selectedTeeth;

    private Boolean isAbnormal;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
