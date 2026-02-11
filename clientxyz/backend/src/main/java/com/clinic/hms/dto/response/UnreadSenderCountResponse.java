package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UnreadSenderCountResponse {

    private Long senderUserId;
    private Long count;
}
