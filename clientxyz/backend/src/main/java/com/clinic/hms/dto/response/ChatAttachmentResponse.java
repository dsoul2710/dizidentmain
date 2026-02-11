package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatAttachmentResponse {

    private Long id;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private String url;
}
