package com.clinic.hms.dto.request;

import lombok.Data;

@Data
public class ChatThreadResolveRequest {

    private String type;
    private Long patientUserId;
    private Long doctorUserId;
    private Long adminUserId;
}
