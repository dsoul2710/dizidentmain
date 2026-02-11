package com.clinic.hms.dto.request;


import lombok.Builder;

import java.util.List;

@Builder
public record VisitExamItemUpsertRequest(
        String itemKey,
        String title,
        String text,
        Boolean isAbnormal,
        String odontogramMode,   // "adult" | "child"
        List<String> selectedTeeth
) {}