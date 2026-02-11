package com.clinic.hms.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class VisitExamItemRequest {

    private Long visitId;             // will be set from path variable
    private String itemKey;           // e.g. "caries", "gingiva"
    private String text;              // the actual clinical notes

    // Odontogram info (per exam item)
    private String odontogramMode;    // "adult" / "child"
    private List<String> selectedTeeth; // ["11","12","21"] etc.
}
