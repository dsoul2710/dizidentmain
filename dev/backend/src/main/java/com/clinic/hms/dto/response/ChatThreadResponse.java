package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatThreadResponse {

    private Long id;
    private String type;
    private Long patientUserId;
    private Long doctorUserId;
    private Long orgUserId;
    private String createdAt;
    private String updatedAt;
}
