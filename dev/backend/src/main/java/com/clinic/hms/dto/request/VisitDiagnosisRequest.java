// src/main/java/com/clinic/hms/dto/diagnosis/VisitDiagnosisRequest.java
package com.clinic.hms.dto.request;

import com.clinic.hms.dto.ExamFindingDto;
import lombok.Data;

import java.util.List;

@Data
public class VisitDiagnosisRequest {

    private Long patientUserId;      // required
    private Long visitId;            // optional (null => create new visit)

    private String odontogramMode;   // "adult" / "child"
    private List<String> selectedTeeth;

    private String freeDescription;  // text box
    private String finalDescription; // composedDescription

    private List<ExamFindingDto> examFindings;

    private String reportType;       // optional
    private String reportNote;       // optional
}
